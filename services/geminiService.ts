
import { GoogleGenAI } from "https://aistudiocdn.com/@google/genai@^1.28.0";
import type { Report } from '../types';

export const generateSnpSummary = async (rsid: string, genotype: string): Promise<{ text: string, citations: any[] }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-pro-preview';
        const prompt = `Provide a detailed technical and phenotypic summary for the SNP with rsID: ${rsid} and genotype (${genotype}). 
        
        Perform a targeted search on NIH PubMed, Google Scholar, and arXiv for the latest research, including any known associations with neurocognitive functions relevant to SSA Listings 11.00 or 12.02.
        
        The summary must include:
        1. The gene associated with the polymorphism.
        2. A summary of its biological function.
        3. The latest findings on its phenotypic impact from peer-reviewed journals.
        4. A list of citations from the search.
        
        Format the response as clear, concise Markdown.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingBudget: 8000 }
            }
        });

        return {
            text: String(response.text || 'No summary could be generated.'),
            citations: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        };
    } catch (error) {
        console.error(`Error generating summary for ${rsid}:`, error);
        throw new Error(`Failed to analyze SNP ${rsid}.`);
    }
};


export const generateGPRSExhibit = async (
    context: string, 
    cohort: string = "McLaughlin-2024-REF", 
    vizType: 'histogram' | 'density' = 'density'
): Promise<{text: string, citations: any[]}> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-pro-preview';

        const prompt = `Perform 4 distinct technical searches (NIH PubMed, Google Scholar, arXiv, and BioRxiv) for the most recent effect size weights (OR/Beta) for heterozygous polymorphisms related to neurocognitive disability (SSA Listing 12.02). 
        
        Using these findings, synthesize a 'Technical Exhibit' for the RIGOR-HSPA-Secure++ system.
        
        Target File Context: ${context}
        Target Cohort: ${cohort}
        Desired Visualization focus: ${vizType} analysis
        
        The report must include:
        1. A breakdown of the HSPA-GPRS floating equation using the ${cohort} parameters.
        2. Citations from PubMed/Arxiv relevant to the ${cohort} study or similar phenotypic groupings.
        3. Analysis of heterozygous polymorphisms (AG, CT, GT) expected in the McLaughlin genome file, with a specific focus on how a ${vizType} distribution would represent this liability.
        4. A floating GPRS score calculation based on the integrated search data.
        
        Format as Markdown with ## headings. Use technical, legal, and scientific language appropriate for a Social Security Administration technical exhibit.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingBudget: 12000 }
            }
        });

        return {
            text: String(response.text || ''),
            citations: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        };
    } catch (error) {
        console.error("GPRS Oracle Error:", error);
        throw error;
    }
};

export const generateReportContent = async (report: Report): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-pro-preview';
        const template = report.sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n---\n\n');

        const systemInstruction = `You are the Lead Validation Engineer for RIGOR-HSPA-Secure++.
Reference context: ${report.context}
Populate the report with technical data. If this is Report 1, reference the McLaughlin genome file.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: `Complete this report: ${report.title}\n\n${template}`,
            config: {
                systemInstruction,
                thinkingConfig: { thinkingBudget: 8000 }
            }
        });
        return String(response.text || '');
    } catch (error) {
        console.error("Report Generation Error:", error);
        throw error;
    }
};

export const generateComplianceReport = async (framework: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-flash-preview';
        const systemInstruction = `You are a legal-tech analyst specializing in algorithmic compliance for government systems. Your task is to provide a concise, technical summary of compliance considerations for the RIGOR-HSPA-Secure++ platform, specifically in relation to the provided legal/policy framework. Focus on actionable points for a government accessibility officer.`;
        
        const prompt = `Generate a brief summary (3-4 paragraphs) outlining key compliance considerations for the RIGOR-HSPA-Secure++ system under the "${framework}" framework. The summary should cover data privacy, algorithmic fairness, and evidence admissibility.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction
            }
        });
        return String(response.text || 'Could not generate compliance summary.');
    } catch (error) {
        console.error("Compliance Report Generation Error:", error);
        return "Failed to generate compliance summary due to an API error.";
    }
};