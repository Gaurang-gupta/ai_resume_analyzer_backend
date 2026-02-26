"use strict";
// import 'dotenv/config'
// import { createClient } from '@supabase/supabase-js'
// import pdf from 'pdf-parse'
// import { analyzeResume } from './analyzeResume';
// import {AnalysisInput, AnalysisRow} from './types';
//
// // analyses
// const supabase = createClient(
//     process.env.SUPABASE_URL as string,
//     process.env.SUPABASE_SERVICE_ROLE_KEY as string
// )
//
// async function claimNextJob(): Promise<AnalysisRow | null> {
//     const { data: jobs, error } = await supabase
//         .from('analyses')
//         .select(`
//             *,
//             id,
//             resume_id,
//             job_title,
//             job_description,
//             experience_level,
//             resumes ( storage_path )
//         `)
//         .eq('status', 'queued')
//         .order('created_at', { ascending: true })
//         .limit(1)
//
//     if (error || !jobs || jobs.length === 0) {
//         return null
//     }
//
//     const job = jobs[0] as AnalysisRow
//
//     // 🔥 atomic claim attempt
//     const { data: claimed, error: claimError } = await supabase
//         .from('analyses')
//         .update({
//             status: 'processing',
//             started_at: new Date().toISOString()
//         })
//         .eq('id', job.id)
//         .eq('status', 'queued') // important
//         .select()
//         .single()
//
//     if (claimError || !claimed) {
//         return null // someone else claimed it
//     }
//
//     return job
// }
//
// async function run() {
//     console.log('Worker started...')
//     const job = await claimNextJob()
//     if (!job) {
//         console.log('No queued jobs.')
//         return
//     }
//
//     const jobTitle = job.job_title
//     const jobDescription = job.job_description
//     const experienceLevel= job.experience_level
//     if (!jobTitle || !jobDescription || !experienceLevel) {
//         console.error('Missing required analysis fields');
//         await supabase
//             .from('analyses')
//             .update({ status: 'failed' })
//             .eq('id', job.id);
//         return;
//     }
//
//     console.log('Claiming job:', job.id)
//
//     // 2. Mark processing
//     const { error: claimError } = await supabase
//         .from('analyses')
//         .update({
//             status: 'processing',
//             started_at: new Date().toISOString()
//         })
//         .eq('id', job.id)
//
//     if (claimError) {
//         console.error('Failed to claim job:', claimError.message)
//         return
//     }
//
//     try {
//         console.log('Processing job...')
//         let resumeText: string | null
//         const { data: resumeRow } = await supabase
//             .from("resumes")
//             .select("resume_text")
//             .eq("id", job.resume_id)
//             .single()
//
//         resumeText = resumeRow?.resume_text ?? null
//         const bucketName = 'resumes' // change if your bucket is named differently
//
//         if(!resumeText) {
//             const {data: fileData, error: fileError} =
//                 await supabase.storage
//                     .from(bucketName)
//                     .download(job.resumes.storage_path)
//
//
//             if (fileError || !fileData) {
//                 throw new Error('Failed to download resume file')
//             }
//             console.log(job.resumes.storage_path)
//
//             const buffer = Buffer.from(await fileData.arrayBuffer())
//             const result = await pdf(buffer)
//             resumeText = result.text
//             // updating resume_text field
//             const {error: resumeError} = await supabase
//                 .from("resumes")
//                 .update({
//                     resume_text: resumeText,
//                     text_extracted_at: new Date().toISOString()
//                 })
//                 .eq('id', job.resume_id)
//
//             if(resumeError) {
//                 throw new Error("Failed to store resume text from the file")
//             }
//         }
//         const input: AnalysisInput = {
//             resumeText: resumeText,
//             jobTitle: jobTitle,
//             jobDescription: jobDescription,
//             experienceLevel: experienceLevel // from analyses table
//         };
//         if (!resumeText || resumeText.trim().length === 0) {
//             throw new Error('Failed to extract text from PDF')
//         }
//
//         const analyzeResult = await analyzeResume(input)
//
//         // 3. Mark completed
//         if (!resumeText || resumeText.trim().length < 100) {
//             throw new Error("Extracted text too short")
//         }
//         const { error: completeError } = await supabase
//             .from('analyses')
//             .update({
//                 status: 'completed',
//                 completed_at: new Date().toISOString(),
//                 result: analyzeResult
//             })
//             .eq('id', job.id)
//
//         console.log({
//             jobId: job.id,
//             extractedLength: resumeText.length,
//             status: "completed"
//         })
//
//         if (completeError) {
//             throw new Error(completeError.message)
//         }
//
//         console.log('Job completed.')
//     } catch (err: unknown) {
//         const errorMessage =
//             err instanceof Error ? err.message : 'Unknown error'
//
//         console.error('Processing failed:', errorMessage)
//         if (errorMessage.includes("429")) {
//             console.error("Quota exceeded. Stopping worker.");
//             process.exit(1);
//         }
//
//         await supabase
//             .from('analyses')
//             .update({
//                 status: 'failed',
//                 failed_at: new Date().toISOString(),
//                 error_message: errorMessage
//             })
//             .eq('id', job.id)
//     }
// }
//
// async function processLoop() {
//     while (true) {
//         await run()
//
//         // wait 30 minutes before checking again
//         const time = 1000
//         await new Promise(resolve => setTimeout(resolve, time))
//     }
// }
//
// processLoop()
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const analyzeResume_1 = require("./analyzeResume");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
/* ----------------------------- UTILITIES ----------------------------- */
function log(event, data) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ...data,
    }));
}
function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
}
function validateResult(result) {
    return (typeof result?.overallScore === 'number' &&
        result?.skills &&
        Array.isArray(result.skills.matched) &&
        Array.isArray(result.recommendations));
}
function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Analysis timeout'));
        }, ms);
        promise
            .then((value) => {
            clearTimeout(timeout);
            resolve(value);
        })
            .catch((err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}
/* ----------------------------- JOB CLAIM ----------------------------- */
async function claimNextJob() {
    const { data: jobs, error } = await supabase
        .from('analyses')
        .select(`
      *,
      resumes ( storage_path )
    `)
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);
    if (error || !jobs || jobs.length === 0) {
        return null;
    }
    const job = jobs[0];
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
        .single();
    if (!claimed) {
        return null;
    }
    return job;
}
/* ----------------------------- PROCESS JOB ----------------------------- */
async function processJob(job) {
    log('JOB_STARTED', { jobId: job.id });
    const { job_title, job_description, experience_level } = job;
    if (!job_title || !job_description || !experience_level) {
        throw new Error('Missing required analysis fields');
    }
    /* ---------- GET RESUME TEXT (CACHE FIRST) ---------- */
    const { data: resumeRow } = await supabase
        .from('resumes')
        .select('resume_text')
        .eq('id', job.resume_id)
        .single();
    let resumeText = resumeRow?.resume_text ?? null;
    if (!resumeText) {
        if (!job.resumes?.storage_path) {
            throw new Error('Missing storage path');
        }
        const { data: fileData, error: fileError } = await supabase.storage
            .from('resumes')
            .download(job.resumes.storage_path);
        if (fileError || !fileData) {
            throw new Error('Failed to download resume file');
        }
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const result = await (0, pdf_parse_1.default)(buffer);
        resumeText = result.text;
        if (!resumeText || resumeText.trim().length < 100) {
            throw new Error('Extracted text too short');
        }
        resumeText = normalizeText(resumeText);
        await supabase
            .from('resumes')
            .update({
            resume_text: resumeText,
            text_extracted_at: new Date().toISOString(),
        })
            .eq('id', job.resume_id);
    }
    /* ---------- ANALYSIS ---------- */
    const input = {
        resumeText,
        jobTitle: job_title,
        jobDescription: job_description,
        experienceLevel: experience_level,
    };
    const analyzeResult = await withTimeout((0, analyzeResume_1.analyzeResume)(input), 60_000);
    if (!validateResult(analyzeResult)) {
        throw new Error('Invalid LLM response format');
    }
    /* ---------- COMPLETE ---------- */
    await supabase
        .from('analyses')
        .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: analyzeResult,
    })
        .eq('id', job.id);
    log('JOB_COMPLETED', {
        jobId: job.id,
        score: analyzeResult.overallScore,
    });
}
/* ----------------------------- ERROR HANDLING ----------------------------- */
async function handleFailure(jobId, errorMessage) {
    const { data: current } = await supabase
        .from('analyses')
        .select('retry_count, max_retries')
        .eq('id', jobId)
        .single();
    const retryCount = current?.retry_count ?? 0;
    const maxRetries = current?.max_retries ?? 3;
    if (retryCount < maxRetries) {
        await supabase
            .from('analyses')
            .update({
            status: 'queued',
            retry_count: retryCount + 1,
            error_message: errorMessage,
        })
            .eq('id', jobId);
        log('JOB_RETRYING', { jobId, retryCount: retryCount + 1 });
    }
    else {
        await supabase
            .from('analyses')
            .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: errorMessage,
        })
            .eq('id', jobId);
        log('JOB_FAILED', { jobId, error: errorMessage });
    }
}
/* ----------------------------- RUN LOOP ----------------------------- */
async function run() {
    const job = await claimNextJob();
    if (!job) {
        return false;
    }
    try {
        await processJob(job);
        return true;
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        await handleFailure(job.id, errorMessage);
        return true;
    }
}
async function processLoop() {
    let idleDelay = 1000;
    log('WORKER_STARTED');
    while (true) {
        const processed = await run();
        if (processed) {
            idleDelay = 1000;
        }
        else {
            idleDelay = Math.min(idleDelay * 2, 30000);
        }
        await new Promise((res) => setTimeout(res, idleDelay));
    }
}
processLoop();
