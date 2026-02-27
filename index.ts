import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import pdf from 'pdf-parse'
import { analyzeResume } from './analyzeResume'
import { AnalysisInput, AnalysisRow } from './types'

const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

/* ----------------------------- UTILITIES ----------------------------- */

function log(event: string, data?: any) {
    console.log(
        JSON.stringify({
            timestamp: new Date().toISOString(),
            event,
            ...data,
        })
    )
}

function normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
}

function validateResult(result: any): boolean {
    return (
        typeof result?.overallScore === 'number' &&
        result?.skills &&
        Array.isArray(result.skills.matched) &&
        Array.isArray(result.recommendations)
    )
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Analysis timeout'))
        }, ms)

        promise
            .then((value) => {
                clearTimeout(timeout)
                resolve(value)
            })
            .catch((err) => {
                clearTimeout(timeout)
                reject(err)
            })
    })
}

/* ----------------------------- JOB CLAIM ----------------------------- */

async function claimNextJob(): Promise<AnalysisRow | null> {
    const { data: jobs, error } = await supabase
        .from('analyses')
        .select(
            `
      *,
      resumes ( storage_path )
    `
        )
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1)

    if (error || !jobs || jobs.length === 0) {
        return null
    }

    const job = jobs[0] as AnalysisRow

    // atomic claim
    const { data: claimed } = await supabase
        .from('analyses')
        .update({
            status: 'processing',
            started_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'queued')
        .select()
        .single()

    if (!claimed) {
        return null
    }

    return job
}

/* ----------------------------- PROCESS JOB ----------------------------- */

async function processJob(job: AnalysisRow) {
    log('JOB_STARTED', { jobId: job.id })
    // const started_at = new Date().toISOString();

    const { job_title, job_description, experience_level } = job

    if (!job_title || !job_description || !experience_level) {
        throw new Error('Missing required analysis fields')
    }

    /* ---------- GET RESUME TEXT (CACHE FIRST) ---------- */

    const { data: resumeRow } = await supabase
        .from('resumes')
        .select('resume_text')
        .eq('id', job.resume_id)
        .single()

    let resumeText = resumeRow?.resume_text ?? null

    if (!resumeText) {
        if (!job.resumes?.storage_path) {
            throw new Error('Missing storage path')
        }

        const { data: fileData, error: fileError } =
            await supabase.storage
                .from('resumes')
                .download(job.resumes.storage_path)

        if (fileError || !fileData) {
            throw new Error('Failed to download resume file')
        }

        const buffer = Buffer.from(await fileData.arrayBuffer())
        const result = await pdf(buffer)
        resumeText = result.text

        if (!resumeText || resumeText.trim().length < 100) {
            throw new Error('Extracted text too short')
        }

        resumeText = normalizeText(resumeText)

        await supabase
            .from('resumes')
            .update({
                resume_text: resumeText,
                text_extracted_at: new Date().toISOString(),
            })
            .eq('id', job.resume_id)
    }

    /* ---------- ANALYSIS ---------- */

    const input: AnalysisInput = {
        resumeText,
        jobTitle: job_title,
        jobDescription: job_description,
        experienceLevel: experience_level,
    }

    const {result, usage, model, metadata} = await withTimeout(
        analyzeResume(input),
        60_000
    )

    if (!validateResult(result)) {
        throw new Error('Invalid LLM response format')
    }

    /* ---------- COMPLETE ---------- */

    log("LLM_METADATA", {usage, metadata})
    await supabase
        .from('analyses')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            input_tokens: usage?.input_tokens,
            output_tokens: usage?.output_tokens,
            model: model,
            result: result,
            prompt_version: metadata.prompt_version,
            duration_ms: metadata?.duration_ms,
        })
        .eq('id', job.id)

    log('JOB_COMPLETED', {
        jobId: job.id,
        score: result.overallScore,
    })
}

/* ----------------------------- ERROR HANDLING ----------------------------- */

async function handleFailure(jobId: string, errorMessage: string) {
    const { data: current } = await supabase
        .from('analyses')
        .select('retry_count, max_retries')
        .eq('id', jobId)
        .single()

    const retryCount = current?.retry_count ?? 0
    const maxRetries = current?.max_retries ?? 3

    if (retryCount < maxRetries) {
        await supabase
            .from('analyses')
            .update({
                status: 'queued',
                retry_count: retryCount + 1,
                error_message: errorMessage,
            })
            .eq('id', jobId)

        log('JOB_RETRYING', { jobId, retryCount: retryCount + 1 })
    } else {
        await supabase
            .from('analyses')
            .update({
                status: 'failed',
                failed_at: new Date().toISOString(),
                error_message: errorMessage,
            })
            .eq('id', jobId)

        log('JOB_FAILED', { jobId, error: errorMessage })
    }
}

/* ----------------------------- RUN LOOP ----------------------------- */

async function run(): Promise<boolean> {
    const job = await claimNextJob()

    if (!job) {
        return false
    }

    try {
        await processJob(job)
        return true
    } catch (err: unknown) {
        const errorMessage =
            err instanceof Error ? err.message : 'Unknown error'

        await handleFailure(job.id, errorMessage)
        return true
    }
}

async function processLoop() {
    let idleDelay = 1000

    log('WORKER_STARTED')

    while (true) {
        const processed = await run()

        if (processed) {
            idleDelay = 1000
        } else {
            idleDelay = Math.min(idleDelay * 2, 30000)
        }

        await new Promise((res) => setTimeout(res, idleDelay))
    }
}

processLoop()