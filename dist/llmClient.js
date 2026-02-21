"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeResumeWithLLM = analyzeResumeWithLLM;
const ai_1 = require("ai");
const google_1 = require("@ai-sdk/google");
const zod_1 = require("zod");
const LLMAnalysisSchema = zod_1.z.object({
    overallScore: zod_1.z.number().min(0).max(100),
    summary: zod_1.z.string().min(10),
    breakdown: zod_1.z.object({
        skillsMatch: zod_1.z.number().min(0).max(100),
        experienceMatch: zod_1.z.number().min(0).max(100),
        educationMatch: zod_1.z.number().min(0).max(100),
    }),
    skills: zod_1.z.object({
        matched: zod_1.z.array(zod_1.z.string()),
        missing: zod_1.z.array(zod_1.z.string())
    }),
    experience: zod_1.z.object({
        requiredLevel: zod_1.z.string(),
        inferredLevel: zod_1.z.string(),
        gapReason: zod_1.z.optional(zod_1.z.string()),
    }),
    education: zod_1.z.object({
        meetsRequirement: zod_1.z.boolean(),
        notes: zod_1.z.optional(zod_1.z.string()),
    }),
    strengths: zod_1.z.array(zod_1.z.string()),
    recommendations: zod_1.z.array(zod_1.z.string())
});
async function analyzeResumeWithLLM(params) {
    const { resumeText, jobTitle, jobDescription, experienceLevel } = params;
    const currentDatetime = new Date().toISOString();
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
    const { object } = await (0, ai_1.generateObject)({
        model: (0, google_1.google)("gemini-2.5-flash"),
        schema: LLMAnalysisSchema,
        system: systemPrompt,
        prompt: userPrompt,
    });
    console.log(object);
    return object;
}
