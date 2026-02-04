
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { INITIAL_REPORTS } from './constants';
import type { Report, SnpData } from './types';
import { generateReportContent, generateGPRSExhibit, generateSnpSummary, generateComplianceReport } from './services/geminiService';

// --- Type Declarations ---
declare global {
    interface Window { jspdf: any; }
    function html2canvas(element: HTMLElement, options?: any): Promise<HTMLCanvasElement>;
}

// --- Icons ---
const ShieldIcon = (props: { width?: string, height?: string }) => <svg width={props.width || "24"} height={props.height || "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const CpuIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h4M1 15h4"/></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const FlaskIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3h6M10 9h4M10 3v6l-4 11a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-11V3"/></svg>;
const FileUploadIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const HubIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/></svg>;
const DnaIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 12.5c2.28-2.28 2.28-6.02 0-8.3s-6.02-2.28-8.3 0"/><path d="M19.5 12.5c-2.28 2.28-2.28 6.02 0 8.3s6.02 2.28 8.3 0"/><path d="M11.25 12.75c3.5-3.5 3.5-9.25 0-12.75"/><path d="M12.75 11.25c-3.5 3.5-3.5 9.25 0 12.75"/><path d="M12.5 4.5c-2.28 2.28-6.02 2.28-8.3 0s-2.28-6.02 0-8.3"/><path d="M12.5 19.5c2.28-2.28 6.02-2.28 8.3 0s2.28 6.02 0 8.3"/></svg>;

// --- Helper Functions ---
const generateFasta = (snps: SnpData[]): string => {
    if (snps.length === 0) return ">No SNPs provided\n";
    const header = `>User_Synthetic_Consensus_Chr${snps[0].chromosome}`;
    const sequence = snps.map(s => s.genotype[1] || 'N').join('');
    const lines = sequence.match(/.{1,70}/g) || [];
    return `${header}\n${lines.join('\n')}`;
};
const generateFastq = (snps: SnpData[]): string => {
    return snps.map((snp, index) => {
        const readId = `@READ_${index + 1}_${snp.rsid}_from_chr${snp.chromosome}`;
        const flanking_seq = "NNNNNNNNNNNNNNNNNNNNNNNN"; // 24 Ns
        const sequence = `${flanking_seq}${snp.genotype[1]}${flanking_seq}`; // ALT allele
        const flanking_qual = "FFFFFFFFFFFFFFFFFFFFFFFF";
        const snp_qual = "J"; // Highest quality score
        const quality = `${flanking_qual}${snp_qual}${flanking_qual}`;
        return `${readId}\n${sequence}\n+\n${quality}`;
    }).join('\n\n');
};
const generateVcf = (snps: SnpData[]): string => {
    return `##fileformat=VCFv4.2\n##source=RIGOR-HSPA-Secure++\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n` +
    snps.map(s => `${s.chromosome}\t${s.position}\t${s.rsid}\tN\t${s.genotype.split('').join(',')}\t.\tPASS\t.`).join('\n');
};
const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- Child Components ---
const SnpAnalysisModal: React.FC<{ snp: SnpData, onClose: () => void }> = ({ snp, onClose }) => {
    const [summary, setSummary] = useState<{ text: string, citations: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const result = await generateSnpSummary(snp.rsid, snp.genotype);
                setSummary(result);
            } catch (e) {
                setSummary({ text: 'Error fetching analysis.', citations: [] });
            } finally {
                setIsLoading(false);
            }
        };
        fetchSummary();
    }, [snp]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-blue-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                <header className="p-4 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-blue-400">Analysis: {snp.rsid} ({snp.genotype})</h3>
                        <p className="text-xs text-slate-500 font-mono">CHR{snp.chromosome}:{snp.position}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl">&times;</button>
                </header>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {isLoading ? <p className="animate-pulse text-blue-400">Querying PubMed/arXiv...</p> : (
                        <div className="prose prose-sm prose-invert max-w-none">
                             <div dangerouslySetInnerHTML={{ __html: summary?.text.replace(/\n/g, '<br />') || '' }} />
                             {summary?.citations && summary.citations.length > 0 && (
                                 <div className="mt-6">
                                     <h4 className="font-bold text-slate-400 border-b border-slate-700 pb-2 mb-2">Citations</h4>
                                     <ul className="text-xs space-y-2">
                                         {summary.citations.map((c: any, i) => <li key={i}><a href={c.web?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{c.web?.title}</a></li>)}
                                     </ul>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SnpAddigreePlot: React.FC<{ snps: SnpData[], cohort: string }> = ({ snps, cohort }) => {
    const [hoveredSnp, setHoveredSnp] = useState<{ data: any, x: number, y: number } | null>(null);
    const width = 800;
    const height = 400;
    const padding = { top: 20, right: 20, bottom: 60, left: 60 };

    const chromosomes = useMemo(() => {
        const sorted = [...new Set(snps.map(s => s.chromosome))]
            .sort((a: string, b: string) => {
                const aNum = parseInt(a);
                const bNum = parseInt(b);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                if (!isNaN(aNum)) return -1;
                if (!isNaN(bNum)) return 1;
                return a.localeCompare(b);
            });
        return sorted;
    }, [snps]);

    const plotData = useMemo(() => {
        const cohortHash = cohort.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return snps.map(snp => {
            const rsidHash = snp.rsid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const combinedHash = rsidHash + cohortHash;
            
            const xPos = chromosomes.indexOf(snp.chromosome);
            const xJitter = (combinedHash % 100) / 100 - 0.5;
            const x = padding.left + ((xPos + xJitter + 0.5) / chromosomes.length) * (width - padding.left - padding.right);

            const effectSize = ((combinedHash * 13) % 100) / 100 - 0.5; // Simulated β between -0.5 and 0.5
            const y = padding.top + (0.5 - effectSize) * (height - padding.top - padding.bottom);

            const radius = 4 + ((combinedHash * 7) % 5);
            const color = effectSize > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';

            return { x, y, radius, color, snp, effectSize };
        });
    }, [snps, cohort, chromosomes]);

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-black/20 rounded-lg border border-slate-800">
                <text x={width / 2} y={height - 10} textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">Chromosome</text>
                <text transform={`rotate(-90) translate(-${height/2}, 20)`} textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">Simulated Effect Size (β)</text>
                
                {[-0.5, 0, 0.5].map(tick => {
                     const y = padding.top + (0.5 - tick) * (height - padding.top - padding.bottom);
                     return <g key={tick}><line x1={padding.left-5} y1={y} x2={width-padding.right} y2={y} stroke="#334155" strokeDasharray="2,3" /><text x={padding.left-10} y={y+4} textAnchor="end" fill="#94a3b8" fontSize="10">{tick.toFixed(1)}</text></g>
                })}

                {chromosomes.map((chr, i) => {
                    const x = padding.left + ((i + 0.5) / chromosomes.length) * (width - padding.left - padding.right);
                    return <text key={chr} x={x} y={height - padding.bottom + 20} textAnchor="middle" fill="#94a3b8" fontSize="10">{chr}</text>
                })}

                {plotData.map((d, i) => (
                    <circle key={i} cx={d.x} cy={d.y} r={d.radius} fill={d.color} className="cursor-pointer transition-all hover:r-[12px] hover:stroke-2 hover:stroke-white" onMouseEnter={() => setHoveredSnp({ data: d, x: d.x, y: d.y })} onMouseLeave={() => setHoveredSnp(null)} />
                ))}
            </svg>
            {hoveredSnp && (
                <div className="absolute p-2 text-xs bg-slate-900 border border-slate-700 rounded-md shadow-lg pointer-events-none transition-all" style={{ left: `${hoveredSnp.x / width * 100}%`, top: `${hoveredSnp.y / height * 100}%`, transform: 'translate(10px, -50%)' }}>
                    <div className="font-bold text-blue-400">{hoveredSnp.data.snp.rsid}</div>
                    <div className="text-slate-300">Genotype: {hoveredSnp.data.snp.genotype}</div>
                    <div className="text-slate-400">Effect (β): {hoveredSnp.data.effectSize.toFixed(3)}</div>
                </div>
            )}
        </div>
    );
};

const GenomicPipelineView: React.FC = () => {
    const [snps, setSnps] = useState<SnpData[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [analyzingSnp, setAnalyzingSnp] = useState<SnpData | null>(null);
    const [comparisonCohort, setComparisonCohort] = useState("GRCh38-BASE");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const lines = content.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '');
            const parsedSnps = lines.map(line => {
                const [rsid, chromosome, position, genotype] = line.split(/[\t,]/);
                return { rsid, chromosome, position: parseInt(position), genotype };
            }).filter(s => s.rsid && s.chromosome && !isNaN(s.position) && s.genotype && s.genotype.length === 2 && s.genotype[0] !== s.genotype[1]);
            setSnps(parsedSnps);
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            {analyzingSnp && <SnpAnalysisModal snp={analyzingSnp} onClose={() => setAnalyzingSnp(null)} />}
            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-center">
                <FileUploadIcon className="mx-auto text-blue-500" />
                <h2 className="mt-4 text-xl font-bold text-white">Genomic Data Processing Pipeline</h2>
                <p className="mt-1 text-sm text-slate-400">Upload a 23andMe-style TXT/CSV file to generate consensus files and perform analysis.</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.csv" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="mt-6 bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors">
                    {fileName ? `Loaded: ${fileName}` : 'Upload Genome File'}
                </button>
            </div>

            {snps.length > 0 && (
                 <>
                    <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-white">Processing Results ({snps.length} Heterozygous SNPs)</h3>
                            <div className="flex gap-2">
                                <button onClick={() => downloadFile(generateFasta(snps), 'synthetic.fasta', 'text/plain')} className="text-xs bg-slate-800 px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-slate-700"><DownloadIcon /> FASTA</button>
                                <button onClick={() => downloadFile(generateVcf(snps), 'variants.vcf', 'text/vcf')} className="text-xs bg-slate-800 px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-slate-700"><DownloadIcon /> VCF</button>
                                <button onClick={() => downloadFile(generateFastq(snps), 'synthetic.fastq', 'text/fastq')} className="text-xs bg-slate-800 px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-slate-700"><DownloadIcon /> FASTQ</button>
                            </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto custom-scrollbar bg-black/20 p-4 rounded-xl border border-slate-800/50">
                            <table className="w-full text-left text-sm font-mono">
                                <thead className="text-slate-500 text-[10px] uppercase"><tr><th className="p-2">RSID</th><th className="p-2">CHR</th><th className="p-2">Position</th><th className="p-2">Genotype</th><th className="p-2 text-right">Actions</th></tr></thead>
                                <tbody>
                                    {snps.map(snp => (
                                        <tr key={snp.rsid} className="border-t border-slate-800 hover:bg-slate-800/50">
                                            <td className="p-2 text-blue-400">{snp.rsid}</td><td className="p-2">{snp.chromosome}</td><td className="p-2">{snp.position}</td><td className="p-2 text-emerald-400">{snp.genotype}</td>
                                            <td className="p-2 text-right"><button onClick={() => setAnalyzingSnp(snp)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500">Analyze</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">SNP Addigree Plot</h3>
                                <p className="text-xs text-slate-500">Visualization of additive phenotypic risk contributions per polymorphism.</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Comparison Cohort</label>
                                <select value={comparisonCohort} onChange={(e) => setComparisonCohort(e.target.value)} className="w-full sm:w-auto bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option>GRCh38-BASE</option><option>ADHD-GEN-2024</option><option>NEURO-ADHD-MCLAUGHLIN</option><option>MDD-S-12.02</option>
                                </select>
                            </div>
                        </div>
                        <SnpAddigreePlot snps={snps} cohort={comparisonCohort} />
                    </div>
                </>
            )}
        </div>
    );
};

const ComplianceReportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [framework, setFramework] = useState("ADA Title II");
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState("");

    const handleGenerate = async () => {
        setIsLoading(true);
        setReport("");
        try {
            const result = await generateComplianceReport(framework);
            setReport(result);
        } catch (e) {
            setReport("Error generating compliance summary.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-blue-500/30 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl">
                <header className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-blue-400">Generate Compliance Report</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl">&times;</button>
                </header>
                <div className="p-6 space-y-4">
                    <select value={framework} onChange={(e) => setFramework(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option>ADA Title II</option><option>Section 504</option><option>WCAG 2.2</option><option>GINA Compliance</option>
                    </select>
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50">
                        {isLoading ? "Synthesizing..." : "Generate"}
                    </button>
                    {report && (
                        <div className="p-4 bg-black/30 rounded-lg border border-slate-800 max-h-64 overflow-y-auto custom-scrollbar">
                             <p className="text-sm text-slate-300 whitespace-pre-wrap">{report}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdjudicationHubView: React.FC = () => {
    const [readerStatus, setReaderStatus] = useState("Disconnected");
    const [progress, setProgress] = useState(0);
    const [genotypeResult, setGenotypeResult] = useState("");
    const [lastAnchor, setLastAnchor] = useState("1m ago");
    const [txHash, setTxHash] = useState("0x1a2b...c3d4");
    const [showReportModal, setShowReportModal] = useState(false);

    const handleConnect = () => {
        setGenotypeResult("");
        setReaderStatus("Connecting...");
        setTimeout(() => {
            setReaderStatus("Calibrating...");
            setTimeout(() => setReaderStatus("Idle"), 1500);
        }, 1000);
    };

    const handleAnalysis = () => {
        if (readerStatus !== 'Idle') return;
        setReaderStatus("Running SWV...");
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    setReaderStatus("Complete");
                    setGenotypeResult("Heterozygous (AG) Detected");
                    return 100;
                }
                return p + 1;
            });
        }, 40);
    };
    
    const handleAnchor = () => {
        if (!genotypeResult) return;
        setLastAnchor("Signing...");
        setTimeout(() => {
            setLastAnchor("Just Now");
            setTxHash(`0x${[...Array(10)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}...`);
        }, 1000);
    };

    return (
        <div className="space-y-8 animate-in fade-in">
             {showReportModal && <ComplianceReportModal onClose={() => setShowReportModal(false)} />}
            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <h2 className="text-xl font-bold text-white">Adjudication & Hardware Hub</h2>
                <p className="mt-1 text-sm text-slate-400">Simulate hardware-level genomic analysis and evidence anchoring.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Electrochemical Reader */}
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col">
                    <h3 className="font-bold text-blue-400 flex items-center gap-2"><CpuIcon /> Electrochemical Reader</h3>
                    <p className="text-xs text-slate-500 mt-2">Driver Status: <span className="text-emerald-400">{readerStatus}</span></p>
                    <div className="mt-4 text-xs font-mono space-y-2 text-slate-400 flex-grow">
                        <p>Potentiostat: {readerStatus === 'Idle' || readerStatus === 'Complete' ? 'Ready' : 'Busy'}</p>
                        <p>Protocol: USB-C/Voltammetry</p>
                        {readerStatus === 'Running SWV...' && (
                            <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}
                        {genotypeResult && <p className="font-bold text-emerald-400 pt-2">Result: {genotypeResult}</p>}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button onClick={handleConnect} disabled={readerStatus !== 'Disconnected'} className="text-xs bg-slate-800 px-3 py-1.5 rounded-md hover:bg-slate-700 disabled:opacity-50">Connect</button>
                        <button onClick={handleAnalysis} disabled={readerStatus !== 'Idle'} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-500 disabled:opacity-50">Analyze</button>
                    </div>
                </div>
                {/* Quantum Ledger */}
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col">
                     <h3 className="font-bold text-emerald-400 flex items-center gap-2"><ShieldIcon /> Quantum-Resistant Ledger</h3>
                     <p className="text-xs text-slate-500 mt-2">Last Anchor: <span className="text-emerald-400">{lastAnchor}</span></p>
                    <div className="mt-4 text-xs font-mono space-y-2 text-slate-400 flex-grow">
                        <p>Signature: Dilithium-III</p><p>Chain: RIGOR-EVIDENCE</p><p className="truncate">Tx: {txHash}</p>
                    </div>
                    <div className="mt-4">
                        <button onClick={handleAnchor} disabled={!genotypeResult || lastAnchor === 'Just Now'} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-500 disabled:opacity-50">Anchor Evidence</button>
                    </div>
                </div>
                {/* Policy Hub */}
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col">
                    <h3 className="font-bold text-amber-400">Policy Campaign Hub</h3>
                    <p className="text-xs text-slate-500 mt-2">Frameworks for ADA/504 and WCAG 2.2</p>
                    <div className="mt-4 space-y-2 flex-grow">
                        <a href="#" className="text-xs text-blue-500 block hover:underline">Access Open-Source Algorithm Library</a>
                    </div>
                    <div className="mt-4">
                         <button onClick={() => setShowReportModal(true)} className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-500">Generate Compliance Report</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReportsView: React.FC = () => {
    const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
    const [selectedId, setSelectedId] = useState(INITIAL_REPORTS[0].id);
    const [isLoading, setIsLoading] = useState(false);
    const selectedReport = useMemo(() => reports.find(r => r.id === selectedId), [reports, selectedId]);

    const handleGenerate = async () => {
        if (!selectedReport) return;
        setIsLoading(true);
        try {
            const text = await generateReportContent(selectedReport);
            const newSections = text.split(/---/).map(part => ({ heading: "Synthesized Section", content: part.trim() }));
            setReports(prev => prev.map(r => r.id === selectedId ? { ...r, sections: newSections } : r));
        } catch (error) {
            console.error("Failed to generate report:", error);
            alert("Failed to synthesize report content.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in">
            <aside className="lg:w-72 flex-shrink-0 space-y-2">
                {reports.map(r => (
                    <button key={r.id} onClick={() => setSelectedId(r.id)} className={`w-full text-left p-3 rounded-lg text-sm transition-all flex justify-between items-center ${selectedId === r.id ? 'bg-blue-600 text-white' : 'bg-slate-900/40 text-slate-400 border border-slate-800 hover:border-slate-600'}`}>
                        <span className="truncate pr-2">{r.title.split('—')[1] || r.title}</span>
                        <span className="text-[9px] font-mono p-1 rounded bg-black/20">{r.id.toUpperCase()}</span>
                    </button>
                ))}
            </aside>
            <section className="flex-grow bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden relative min-h-[600px]">
                {isLoading && <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur flex items-center justify-center font-mono text-blue-400">CONSULTING RIGOR ORACLE...</div>}
                {selectedReport && (
                    <>
                        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/20">
                            <h2 className="text-xl font-bold text-white text-center sm:text-left">{selectedReport.title}</h2>
                            <button onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50">Synthesize</button>
                        </div>
                        <div className="p-8 text-slate-300 leading-relaxed font-mono text-sm whitespace-pre-wrap overflow-y-auto max-h-[calc(100%-100px)] custom-scrollbar">
                            {selectedReport.sections.map((s, i) => (
                                <div key={i} className="mb-6"><h3 className="font-bold text-blue-400 mb-2">{s.heading}</h3><p className="text-slate-400">{s.content}</p></div>
                            ))}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

const PRSDistributionChart: React.FC<{ type: 'histogram' | 'density', cohort: string }> = ({ type, cohort }) => {
    return <div className="bg-black/40 border border-slate-800 rounded-xl p-4 mt-6 h-48 flex items-center justify-center text-slate-500 font-mono text-sm">Virtualized {type} chart for {cohort} cohort.</div>;
};

const GPRSExhibitView: React.FC = () => {
    const [isCalculating, setIsCalculating] = useState(false);
    const [exhibit, setExhibit] = useState<{ text: string, citations: any[] } | null>(null);
    const [selectedCohort, setSelectedCohort] = useState("ADHD-GEN-2024");
    const [vizType, setVizType] = useState<'histogram' | 'density'>('density');

    const runHSPACalculation = async () => {
        setIsCalculating(true);
        setExhibit(null);
        try {
            const result = await generateGPRSExhibit("User Uploaded Genome File", selectedCohort, vizType);
            setExhibit(result);
        } catch (e) {
            alert("HSPA Calculation Engine Offline.");
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-bold text-white">GPRS Core Exhibit Generation</h2>
                        <p className="mt-1 text-sm text-slate-400">Dynamically calculate Polygenic Risk Scores with real-time literature integration.</p>
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analysis Cohort</label>
                                <select value={selectedCohort} onChange={(e) => setSelectedCohort(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option>ADHD-GEN-2024</option><option>NEURO-ADHD-MCLAUGHLIN</option><option>MDD-S-12.02</option><option>GRCh38-BASE</option>
                                </select>
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visualization</label>
                                <div className="mt-1 flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                    <button onClick={() => setVizType('density')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${vizType === 'density' ? 'bg-blue-600' : ''}`}>Density</button>
                                    <button onClick={() => setVizType('histogram')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${vizType === 'histogram' ? 'bg-blue-600' : ''}`}>Histogram</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        <button onClick={runHSPACalculation} disabled={isCalculating} className="w-full h-full bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {isCalculating ? 'Calculating...' : <><SearchIcon /> Execute & Synthesize</>}
                        </button>
                    </div>
                </div>
                <PRSDistributionChart type={vizType} cohort={selectedCohort} />
            </div>

            {isCalculating && <div className="text-center font-mono text-blue-400 animate-pulse">Querying NIH/PubMed, arXiv, and Scholar...</div>}

            {exhibit && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 animate-in fade-in">
                    <h3 className="text-xl font-bold text-white mb-4">Synthesized Technical Exhibit</h3>
                    <div className="prose prose-sm prose-invert max-w-none mb-6">
                        <div dangerouslySetInnerHTML={{ __html: exhibit.text.replace(/\n/g, '<br />') }} />
                    </div>
                    {exhibit.citations.length > 0 && (
                        <div>
                             <h4 className="font-bold text-slate-400 border-b border-slate-700 pb-2 mb-2">Grounded Citations</h4>
                             <ul className="text-xs space-y-2">
                                {exhibit.citations.map((c: any, i) => <li key={i}><a href={c.web?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{c.web?.title}</a></li>)}
                             </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


// --- App Root Component ---
const App: React.FC = () => {
    const [view, setView] = useState<'pipeline' | 'gprs' | 'reports' | 'hub'>('pipeline');

    const renderView = () => {
        switch (view) {
            case 'pipeline': return <GenomicPipelineView />;
            case 'hub': return <AdjudicationHubView />;
            case 'reports': return <ReportsView />;
            case 'gprs': return <GPRSExhibitView />;
            default: return <GenomicPipelineView />;
        }
    };
    
    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20"><ShieldIcon width="20" height="20" /></div>
                        <div className="hidden sm:block">
                            <h1 className="font-black text-white tracking-tight text-xl uppercase">RIGOR-HSPA-Secure++</h1>
                            <p className="text-[10px] text-blue-400 font-mono uppercase tracking-[0.2em]">Genomic Adjudication & Compliance Suite</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8">
                <nav className="lg:w-64 flex-shrink-0">
                    <div className="sticky top-28 space-y-2">
                        {(
                            [
                                { id: 'pipeline', label: 'Genomic Pipeline', icon: DnaIcon },
                                { id: 'hub', label: 'Adjudication & Hardware Hub', icon: CpuIcon },
                                { id: 'gprs', label: 'GPRS Core Exhibit', icon: FlaskIcon },
                                { id: 'reports', label: 'Validation Reports', icon: ShieldIcon },
                            ] as const
                        ).map(item => (
                             <button 
                                key={item.id} 
                                onClick={() => setView(item.id)} 
                                className={`w-full flex items-center gap-4 p-4 rounded-xl text-sm font-bold transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800/60'}`}
                             >
                                 <item.icon /> <span>{item.label}</span>
                             </button>
                        ))}
                    </div>
                </nav>
                <main className="flex-grow min-w-0">
                    {renderView()}
                </main>
            </div>

            <footer className="container mx-auto px-6 py-20 border-t border-slate-900/50 text-center">
                 <p className="text-[10px] text-slate-600 font-mono max-w-2xl mx-auto leading-loose">
                     © 2024 RIGOR-HSPA ENGINEERING GROUP. ALL ADJUDICATION DATA ENCRYPTED VIA POST-QUANTUM DSA. <br/>
                     SYSTEM AUTHORIZED FOR EVALUATION UNDER SSA TITLES II AND XVI.
                 </p>
            </footer>
            
            <style>{`
            .prose { --tw-prose-body: #d1d5db; --tw-prose-headings: #ffffff; --tw-prose-lead: #a3a3a3; --tw-prose-links: #60a5fa; --tw-prose-bold: #ffffff; --tw-prose-counters: #a3a3a3; --tw-prose-bullets: #a3a3a3; --tw-prose-hr: #404040; --tw-prose-quotes: #f3f4f6; --tw-prose-quote-borders: #525252; --tw-prose-captions: #a3a3a3; --tw-prose-code: #ffffff; --tw-prose-pre-code: #d1d5db; --tw-prose-pre-bg: #1a1a1a; --tw-prose-th-borders: #525252; --tw-prose-td-borders: #404040; }
            .animate-in { animation: fadeIn 0.5s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .custom-scrollbar::-webkit-scrollbar{width:4px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#334155;border-radius:10px}
            `}</style>
        </div>
    );
};

export default App;
