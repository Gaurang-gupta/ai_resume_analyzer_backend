"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const analyzeResume_1 = require("./analyzeResume");
// analyses
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    console.log('Worker started...');
    // 1. Find queued job
    const { data: jobs, error } = await supabase
        .from('analyses')
        .select(`
            *,
            id,
            resume_id,
            job_title,
            job_description,
            experience_level,
            resumes (
              storage_path
            )
        `)
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);
    if (error) {
        console.error('DB error:', error.message);
        return;
    }
    if (!jobs || jobs.length === 0) {
        console.log('No queued jobs.');
        return;
    }
    const job = jobs[0];
    const jobTitle = job.job_title;
    const jobDescription = job.job_description;
    const experienceLevel = job.experience_level;
    if (!jobTitle || !jobDescription || !experienceLevel) {
        console.error('Missing required analysis fields');
        await supabase
            .from('analyses')
            .update({ status: 'failed' })
            .eq('id', job.id);
        return;
    }
    console.log('Claiming job:', job.id);
    // 2. Mark processing
    const { error: claimError } = await supabase
        .from('analyses')
        .update({
        status: 'processing',
        started_at: new Date().toISOString()
    })
        .eq('id', job.id);
    if (claimError) {
        console.error('Failed to claim job:', claimError.message);
        return;
    }
    try {
        console.log('Processing job...');
        if (!job.resumes?.storage_path) {
            throw new Error('Missing storage path');
        }
        const bucketName = 'resumes'; // change if your bucket is named differently
        const { data: fileData, error: fileError } = await supabase.storage
            .from(bucketName)
            .download(job.resumes.storage_path);
        if (fileError || !fileData) {
            throw new Error('Failed to download resume file');
        }
        console.log(job.resumes.storage_path);
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const result = await (0, pdf_parse_1.default)(buffer);
        const resumeText = result.text;
        const input = {
            resumeText: resumeText,
            jobTitle: jobTitle,
            jobDescription: jobDescription,
            experienceLevel: experienceLevel // from analyses table
        };
        // updating resume_text field
        const { error: resumeError } = await supabase
            .from("resumes")
            .update({
            resume_text: resumeText,
        })
            .eq('id', job.resume_id);
        if (resumeError || !resumeText || resumeText.trim().length === 0) {
            throw new Error('Failed to extract text from PDF');
        }
        const analyzeResult = await (0, analyzeResume_1.analyzeResume)(input);
        // 3. Mark completed
        if (!resumeText || resumeText.trim().length < 100) {
            throw new Error("Extracted text too short");
        }
        const { error: completeError } = await supabase
            .from('analyses')
            .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: analyzeResult
        })
            .eq('id', job.id);
        console.log({
            jobId: job.id,
            extractedLength: resumeText.length,
            status: "completed"
        });
        if (completeError) {
            throw new Error(completeError.message);
        }
        console.log('Job completed.');
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Processing failed:', errorMessage);
        if (errorMessage.includes("429")) {
            console.error("Quota exceeded. Stopping worker.");
            process.exit(1);
        }
        await supabase
            .from('analyses')
            .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: errorMessage
        })
            .eq('id', job.id);
    }
}
async function processLoop() {
    while (true) {
        await run();
        // wait 30 minutes before checking again
        const time = 1000;
        await new Promise(resolve => setTimeout(resolve, time));
    }
}
processLoop();
