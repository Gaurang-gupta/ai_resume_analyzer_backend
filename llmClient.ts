import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { AnalyzeResumeResponse } from "./types";

const LLMAnalysisSchema = z.object({
    overallScore: z.number().min(0).max(100),
    summary: z.string().min(10),
    breakdown: z.object({
        skillsMatch: z.number().min(0).max(100),
        experienceMatch: z.number().min(0).max(100),
        educationMatch: z.number().min(0).max(100),
    }),
    skills: z.object({
       matched: z.array(z.string()),
       missing: z.array(z.string())
    }),
    experience: z.object({
      requiredLevel: z.string(),
      inferredLevel  : z.string(),
        gapReason: z.optional(z.string()),
    }),
    education: z.object({
        meetsRequirement: z.boolean(),
        notes: z.optional(z.string()),
    }),
    strengths: z.array(z.string()),
    recommendations: z.array(z.string())
});

const MODEL_ID = "gemini-2.5-flash";
const PROMPT_VERSION = "resume-eval-v1.0.0";
export async function analyzeResumeWithLLM(params: {
    resumeText: string;
    jobTitle: string;
    jobDescription: string;
    experienceLevel: string;
}): Promise<AnalyzeResumeResponse> {

    const { resumeText, jobTitle, jobDescription, experienceLevel } = params;
    const currentDatetime = new Date().toISOString();
    const start = Date.now();

    const systemPrompt = `
        You are a strict ATS resume evaluator.
       
        This is the experience level provided by user in years. If it does not match the experience derived from resume, ignore it.
        - Experience level: ${experienceLevel}
        
        I want you calculate dates properly.
        I am giving you the current datetime
        Current Datetime: ${currentDatetime}
        
        You must:
        - Score realistically (do NOT inflate scores)
        - Be critical and specific
        - Provide actionable recommendations
        - Output ONLY valid JSON
    `;

    const userPrompt = `
        JOB TITLE:
        ${jobTitle}
        
        JOB DESCRIPTION:
        ${jobDescription}
        
        RESUME:
        ${resumeText}
        
        Return JSON in this exact format:
        
        {
            overallScore: number; // 0-100
            summary: string;

            breakdown: {
                skillsMatch: number;      // 0-100
                experienceMatch: number;  // 0-100
                educationMatch: number;   // 0-100
            };

            skills: {
                matched: string[];        // explicitly matched skills
                missing: string[];        // explicitly missing skills
            };

            experience: {
                requiredLevel: string;    // from job description
                inferredLevel: string;    // inferred from resume
                gapReason?: string;       // short explanation if mismatch
            };

            education: {
                meetsRequirement: boolean;
                notes?: string;
            };
            
            strengths: string[];
            recommendations: string[];
        }
    `;

    const response = await generateObject({
        model: google(MODEL_ID),
        schema: LLMAnalysisSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0,
    });


    const duration_ms = Date.now() - start;
    const { object, usage } = response

    return {
        result: object,
        usage: {
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
        },
        model: response.response.modelId ?? "gemini-2.5-flash",
        metadata: {
            prompt_version: PROMPT_VERSION,
            duration_ms: duration_ms
        }
    };
}
