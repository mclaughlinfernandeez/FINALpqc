
import { GoogleGenAI } from "@google/genai";
import type { Report } from '../types';

export const generateReportContent = async (report: Report): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        // Using gemini-3-pro-preview for complex STEM and reasoning tasks
        const model = 'gemini-3-pro-preview';
        
        const template = report.sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n---\n\n');

        const systemInstruction = `You are the Lead Validation Engineer for the RIGOR-HSPA-Secure++ system. 
Your task is to populate a technical validation report based on the RIGOR-HSPA-Secure++ specification:
${report.context || 'A post-quantum hybrid semantic processing architecture for genomic adjudication.'}

Guidelines:
- Populate all bracketed [placeholders] with highly specific, realistic synthetic technical data.
- Use actual cryptographic terms (Kyber-768, Dilithium-III, SHA3-256).
- For performance metrics, provide specific ranges (e.g., "AUROC: 0.892 [95% CI: 0.871-0.914]").
- For hardware/ISA details, reference SEG nodes, RLC logic cells, and PMCU Bayesian priors.
- Maintain the strict structure with '##' headings.
- Output ONLY the filled report text. Do not include introductory remarks or conversational filler.
- Ensure the tone is formal, technical, and legally precise.`;

        const prompt = `Report Title: "${report.title}"

Current Template Sections to Populate:
---
${template}
---

Complete the report using synthetic but plausible data for the RIGOR-HSPA-Secure++ validation pipeline:`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction,
                // Enabling thinking budget for deep technical reasoning and adherence to the complex RIGOR specification
                thinkingConfig: { thinkingBudget: 8000 },
                temperature: 0.4, // Lower temperature for more consistent technical output
            }
        });
        
        return response.text;

    } catch (error) {
        console.error("Error generating report content:", error);
        if (error instanceof Error) {
            throw new Error(`RIGOR AI Oracle failure: ${error.message}`);
        }
        throw new Error("Critical failure in the RIGOR-HSPA-Secure++ reasoning engine.");
    }
};
