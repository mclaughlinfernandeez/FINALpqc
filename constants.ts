
import type { Report } from './types';

export const RIGOR_DISSERTATION_CONTEXT = `
SYSTEM SPECIFICATION: RIGOR-HSPA-Secure++
Architecture: Hybrid Semantic Processing Architecture (HSPA) using Semantic Execution Graphs (SEG).
Processor: 128-bit nodes with Bayesian Probabilistic Microcontroller (PMCU) for scheduling.
Genomics: pQC pipeline for SNP ingestion (VCF/CSV), GRCh38 alignment, and Additive Model PRS computation.
Security: Post-Quantum Cryptography (PQC) using Kyber-768 (KEM) and Dilithium-III (DSA).
Legal Mapping: SSA Listings 11.00 (Neurological) and 12.02 (Neurocognitive), ADA Title II, SSR 16-4p.

GPRS CORE EQUATIONS:
1. Floating Weight Vector: ω_i(t) = ∫ [NIH_μ + Arxiv_σ + Scholar_κ] dt
2. HSPA Node Liability: L_node = Σ (ω_i * χ_i) where χ_i ∈ {0, 1, 2} (Allele Count)
3. Adjudication Probability: P(A|G) = sigmoid(L_node * PMCU_prior)
`;

export const GPRS_EXHIBIT_TEMPLATE = `
--- Technical Exhibit: GPRS-HSPA Core ---
1. Floating Equation Architecture
Detail the HSPA-GPRS additive model and its integration with the 128-bit Bayesian PMCU.
---
2. Dynamic Meta-Analysis Grounding
Synthesize 4x real-time search results from PubMed, arXiv, and Scholar for specific SNP loci.
---
3. Polymorphism Adjudication (Heterozygous alleles)
Identify and analyze the impact of heterozygous SNPs found in the McLaughlin genome file.
---
4. Legal Admissibility Score
Final floating calculation mapping the result to Title II disability thresholds.
`;

const rawReportText = `
--- Report 1 ---
Report 1 — Data Provenance & Genomic Lineage (McLaughlin Core)
---
1. Purpose
Document origins of the Caustin McLaughlin genome file for HSPA ingestion.
---
2. Executive summary
• File: genome_Caustin_McLaughlin_Full_20131024071559.txt
• Genomic Reference: GRCh38.fa
• Security: PQC Enclave-Locked.
---
3. Dataset manifest
• Dataset ID: RIGOR-REF-MCLAUGHLIN
• Source: GitHub/mclaughlinfernandeez/snp
--- Report 2 ---
Report 2 — Model Reproducibility & HSPA ISA Validation
---
1. Purpose
Validate SEG execution reproducibility on HSPA-v1.2.
--- Report 3 ---
Report 3 — Performance & Bayesian Calibration Report
--- Report 4 ---
Report 4 — Fairness, Subgroup & Ancestry Bias Audit
--- Report 5 ---
Report 5 — Post-Quantum Security & Privacy Risk Assessment
--- Report 6 ---
Report 6 — Regulatory & Legal Compliance (SSA/ADA)
--- Report 7 ---
Report 7 — Operational Monitoring & Drift Surveillance
--- Report 8 ---
Report 8 — Independent Auditor Final Certification
--- Report 9 ---
Report 9 — Technical Appendix & Colab Deployment Manifest
`;

function parseReports(text: string): Report[] {
  const reportsData = text.trim().split(/--- Report \d+ ---/);
  return reportsData.filter(r => r.trim()).map((reportContent, index) => {
    const sectionsRaw = reportContent.trim().split('---');
    const title = sectionsRaw.shift()!.trim();
    
    const sections = sectionsRaw.map(section => {
      const lines = section.trim().split('\n');
      const heading = lines.shift()?.replace(/^\d+\.\s*/, '').trim() || 'Untitled';
      const content = lines.join('\n').trim();
      return { heading, content };
    });

    return {
      id: `report-${index + 1}`,
      title: title,
      sections,
      context: RIGOR_DISSERTATION_CONTEXT
    };
  });
}

export const INITIAL_REPORTS: Report[] = parseReports(rawReportText);
