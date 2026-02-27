export type ExperienceLevel = 'student' | '0-2' | '3-5' | '6+' | 'career_switcher';

export interface AnalysisRow {
    id: string;
    job_title: string;
    job_description: string;
    resume_id: string;
    experience_level: 'student' | '0-2' | '3-5' | '6+' | 'career_switcher';
    // resumes: {
        storage_path: string;
    // };
}

export interface AnalysisInput {
    resumeText: string;
    jobTitle: string;
    jobDescription: string;
    experienceLevel: ExperienceLevel;
}

export interface AnalysisResult {
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

export interface AnalyzeResumeResponse {
    result: AnalysisResult;
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
    };
    model?: string;
    metadata: {
        prompt_version: string;
        duration_ms: number;
    }
}