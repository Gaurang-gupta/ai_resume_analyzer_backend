import { AnalysisInput, AnalysisResult } from './types';
import { analyzeResumeWithLLM } from './llmClient'; // your GPT wrapper

export async function analyzeResume(input: AnalysisInput): Promise<AnalysisResult> {
    const { resumeText, jobTitle, jobDescription, experienceLevel } = input;
    const result = await analyzeResumeWithLLM({
        resumeText,
        jobTitle,
        jobDescription,
        experienceLevel,
    })

    return result;
}
