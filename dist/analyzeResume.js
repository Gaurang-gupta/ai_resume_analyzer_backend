"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeResume = analyzeResume;
const llmClient_1 = require("./llmClient"); // your GPT wrapper
async function analyzeResume(input) {
    const { resumeText, jobTitle, jobDescription, experienceLevel } = input;
    const result = await (0, llmClient_1.analyzeResumeWithLLM)({
        resumeText,
        jobTitle,
        jobDescription,
        experienceLevel,
    });
    return result;
}
