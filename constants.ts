
import type { Report } from './types';

export const RIGOR_DISSERTATION_CONTEXT = `
SYSTEM SPECIFICATION: RIGOR-HSPA-Secure++
Architecture: Hybrid Semantic Processing Architecture (HSPA) using Semantic Execution Graphs (SEG).
Processor: 128-bit nodes with Bayesian Probabilistic Microcontroller (PMCU) for scheduling.
Genomics: pQC pipeline for SNP ingestion (VCF/CSV), GRCh38 alignment, and Additive Model PRS computation.
Security: Post-Quantum Cryptography (PQC) using Kyber-768 (KEM) and Dilithium-III (DSA).
Legal Mapping: SSA Listings 11.00 (Neurological) and 12.02 (Neurocognitive), ADA Title II, SSR 16-4p.
Deployment: Dockerized HSPA toolchain (hspa-gcc) and QEMU-emulated execution.
`;

const rawReportText = `
--- Report 1 ---
Report 1 — Data Provenance & Genomic Lineage (RIGOR-HSPA)
---
1. Purpose
Document origins of genomic data (SNP/VCF), consent, and lineage for HSPA-Secure++ ingestion.
---
2. Executive summary
• Datasets used: [List VCF/CSV cohorts]
• Genomic Reference: GRCh38.fa
• Ancestry Mapping: [Self-reported vs genetically inferred PCA]
• Legal Basis: GINA-compliant consent forms and IRB approvals.
---
3. Dataset manifest (HSPA Ingestion)
• Dataset ID: [e.g., GEN-RE-2024-ADHD]
• Source: [Institution/Biobank]
• PII/PHI: (Encrypted via Kyber-768 KEM)
• Transformation: (rsID alignment, strand flipping, QC-HWE)
• Checksums: [SHA-256 hash of raw files]
---
4. Recommendations
• Ensure multi-ancestry reweighting (λ factor) is applied to all PRS calculations.
--- Report 2 ---
Report 2 — Model Reproducibility & HSPA ISA Validation
---
1. Purpose
Validate that the SEG (Semantic Execution Graph) execution is reproducible across emulated HSPA cores.
---
2. Executive summary
• ISA Version: HSPA-v1.2 (128-bit)
• Scheduler: Bayesian PMCU (Confidence-based)
• Container: [Docker image digest]
---
3. Development environment
• Toolchain: hspa-gcc (Release 2024.11)
• Runtime: QEMU-HSPA Emulated Environment
---
4. Reproducibility test
• Procedure: Re-run SEG node execution with fixed random seed on PMCU.
• Result: [Confirm hash matching of instruction stream]
--- Report 3 ---
Report 3 — Performance & Bayesian Calibration Report
---
1. Purpose
Quantify predictive accuracy and calibration of the PRS-based liability scores for adjudication.
---
2. Executive summary
• Primary metric: AUROC for phenotypic prediction.
• Calibration: Platt scaling applied to Bayesian PMCU outputs.
---
3. Primary performance results
• Holdout AUROC ± CI: [0.xx]
• Net Benefit: [Threshold analysis for Listing 11.00/12.02]
--- Report 4 ---
Report 4 — Fairness, Subgroup & Ancestry Bias Audit
---
1. Purpose
Detect disparities in HSPA-derived scores across protected demographic and genetic ancestry groups.
---
2. Metrics by subgroup
• Ancestry-Specific AUROC: [European, African, East Asian, Admixed]
• Predictive Parity: [Difference in False Positive Rates]
--- Report 5 ---
Report 5 — Post-Quantum Security & Privacy Risk Assessment
---
1. Purpose
Verify the integrity of the Kyber-768/Dilithium-III cryptographic stack in the RIGOR pipeline.
---
2. Executive summary
• KEM Algorithm: Kyber-768 (FIPS 203)
• Signature Scheme: Dilithium-III (FIPS 204)
• Inner Encryption: AES-256-GCM
---
3. Privacy risk
• k-anonymity for genetic linkage attacks: [Assessment Score]
--- Report 6 ---
Report 6 — Regulatory & Legal Compliance (SSA/ADA)
---
1. Purpose
Map RIGOR-HSPA outputs to SSA Listings 11.00 and 12.02 and legal admissibility standards.
---
2. Compliance mapping
• SSR 16-4p: (Evaluation of genetic info)
• ADA Title II: (Accessibility of digital evidence)
--- Report 7 ---
Report 7 — Operational Monitoring & Drift Surveillance
---
1. Purpose
Define triggers for retraining the Bayesian PMCU based on population shifts.
---
2. Alerting
• Thresholds: [5% drop in AUC; 10% shift in PMCU confidence priors]
--- Report 8 ---
Report 8 — Independent Auditor Final Certification
---
1. Auditor identification
• Credentials: [Auditor Name/Firm]
---
2. Findings
• Cryptographic Integrity: [Pass/Fail]
• Admissibility Score: [High/Medium/Low]
--- Report 9 ---
Report 9 — Technical Appendix & Colab Deployment Manifest
---
1. Checklist
• Dockerfile for hspa-toolchain
• SHA-256 HSPA-ISA binaries
• Legal Memos (GINA/HIPAA)
• Colab Notebook JSON Structure
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
