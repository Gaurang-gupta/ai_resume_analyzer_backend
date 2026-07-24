import {AnalysisInput, AnalyzeResumeResponse} from './types';
import { analyzeResumeWithLLM } from './llmClient'; // your GPT wrapper

export async function analyzeResume(input: AnalysisInput): Promise<AnalyzeResumeResponse> {
    const { resumeText, jobTitle, jobDescription, experienceLevel } = input;
    return await analyzeResumeWithLLM({
        resumeText,
        jobTitle,
        jobDescription,
        experienceLevel,
    })
}
