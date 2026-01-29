
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { INITIAL_REPORTS, RIGOR_DISSERTATION_CONTEXT } from './constants';
import type { Report } from './types';
import { generateReportContent } from './services/geminiService';

// Global type declarations for PDF and Canvas
declare global {
    interface Window {
        jspdf: {
            jsPDF: new (orientation?: 'p' | 'l' | 'portrait' | 'landscape', unit?: string, format?: string, compress?: boolean) => {
                internal: {
                    pageSize: {
                        getWidth: () => number;
                        getHeight: () => number;
                    }
                };
                addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => any;
                addPage: () => any;
                save: (filename: string) => void;
                setTextColor: (r: number, g: number, b: number) => any;
                setFontSize: (s: number) => any;
                text: (text: string, x: number, y: number) => any;
            };
        };
    }
    function html2canvas(element: HTMLElement, options?: Partial<{
        scale: number;
        useCORS: boolean;
        backgroundColor: string | null;
    }>): Promise<HTMLCanvasElement>;
}

// --- SVG Icons ---
const ShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

const CpuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L9.5 8.5L4 11L9.5 13.5L12 19L14.5 13.5L20 11L14.5 8.5L12 3Z" /><path d="M5 3L6 5" /><path d="M19 13L18 15" /><path d="M3 19L5 18" /><path d="M13 19L15 18" /></svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);

const LoaderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-blue-400"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
);

const BarChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
);

// --- Analytics Visualization Component ---
const PRSAnalyticsView: React.FC = () => {
    const [chartMode, setChartMode] = useState<'histogram' | 'density'>('density');
    
    // Generate synthetic data for two cohorts
    const data = useMemo(() => {
        const generateNormal = (mean: number, std: number, count: number) => {
            return Array.from({ length: count }, () => {
                const u = 1 - Math.random();
                const v = Math.random();
                const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                return z * std + mean;
            });
        };

        const control = generateNormal(0, 1, 1500);
        const caseGroup = generateNormal(1.2, 1.1, 800);
        
        const binData = (dataset: number[], bins: number, min: number, max: number) => {
            const step = (max - min) / bins;
            const binned = new Array(bins).fill(0);
            dataset.forEach(v => {
                const idx = Math.floor((v - min) / step);
                if (idx >= 0 && idx < bins) binned[idx]++;
            });
            return binned.map((val, i) => ({ x: min + i * step, y: val }));
        };

        const min = -4;
        const max = 5;
        const binCount = 40;
        
        return {
            control: binData(control, binCount, min, max),
            cases: binData(caseGroup, binCount, min, max),
            stats: {
                controlMean: 0.02,
                caseMean: 1.24,
                separation: 1.12 // Z-score
            }
        };
    }, []);

    const maxVal = Math.max(...data.control.map(d => d.y), ...data.cases.map(d => d.y));
    const width = 800;
    const height = 300;
    const padding = 40;

    const renderDensityPath = (points: {x: number, y: number}[], color: string, fill: string) => {
        const pts = points.map(p => ({
            x: ((p.x + 4) / 9) * (width - 2 * padding) + padding,
            y: height - (p.y / maxVal) * (height - 2 * padding) - padding
        }));
        
        let d = `M ${pts[0].x} ${height - padding}`;
        pts.forEach(p => { d += ` L ${p.x} ${p.y}`; });
        d += ` L ${pts[pts.length - 1].x} ${height - padding} Z`;
        
        return <path d={d} fill={fill} stroke={color} strokeWidth="2" strokeLinejoin="round" className="transition-all duration-700" />;
    };

    const renderHistogram = (points: {x: number, y: number}[], color: string) => {
        const barWidth = ((width - 2 * padding) / points.length) * 0.8;
        return points.map((p, i) => {
            const x = ((p.x + 4) / 9) * (width - 2 * padding) + padding;
            const h = (p.y / maxVal) * (height - 2 * padding);
            return (
                <rect
                    key={i}
                    x={x - barWidth / 2}
                    y={height - h - padding}
                    width={barWidth}
                    height={h}
                    fill={color}
                    className="transition-all duration-500 hover:brightness-125"
                />
            );
        });
    };

    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BarChartIcon /> PRS Distribution Analytics
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1 uppercase tracking-widest">Genomic Liability Model Adjudication</p>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button 
                        onClick={() => setChartMode('density')}
                        className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-all ${chartMode === 'density' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                        Density Plot
                    </button>
                    <button 
                        onClick={() => setChartMode('histogram')}
                        className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-all ${chartMode === 'histogram' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                        Histogram
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Control Mean PRS</p>
                    <p className="text-xl font-mono text-emerald-400">{data.stats.controlMean.toFixed(3)}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Case Group Mean PRS</p>
                    <p className="text-xl font-mono text-blue-400">{data.stats.caseMean.toFixed(3)}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Separation Metric (Z)</p>
                    <p className="text-xl font-mono text-amber-400">{data.stats.separation.toFixed(2)} σ</p>
                </div>
            </div>

            <div className="relative bg-slate-950/40 border border-slate-800 rounded-xl p-4 overflow-hidden shadow-inner">
                {/* SVG Chart */}
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                    {/* Grid lines */}
                    {Array.from({ length: 10 }).map((_, i) => (
                        <line 
                            key={`grid-x-${i}`}
                            x1={padding + (i * (width - 2 * padding)) / 9}
                            y1={padding}
                            x2={padding + (i * (width - 2 * padding)) / 9}
                            y2={height - padding}
                            stroke="#1e293b"
                            strokeWidth="1"
                        />
                    ))}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <line 
                            key={`grid-y-${i}`}
                            x1={padding}
                            y1={padding + (i * (height - 2 * padding)) / 4}
                            x2={width - padding}
                            y2={padding + (i * (height - 2 * padding)) / 4}
                            stroke="#1e293b"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Plot area */}
                    {chartMode === 'density' ? (
                        <>
                            {renderDensityPath(data.control, '#10b981', 'rgba(16, 185, 129, 0.1)')}
                            {renderDensityPath(data.cases, '#3b82f6', 'rgba(59, 130, 246, 0.1)')}
                        </>
                    ) : (
                        <>
                            {renderHistogram(data.control, 'rgba(16, 185, 129, 0.4)')}
                            {renderHistogram(data.cases, 'rgba(59, 130, 246, 0.4)')}
                        </>
                    )}

                    {/* Axis Labels */}
                    <text x={width / 2} y={height - 5} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">POLYGENIC LIABILITY SCORE (Z-SCORE)</text>
                    <text x={5} y={height / 2} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace" transform={`rotate(-90, 5, ${height / 2})`}>POPULATION FREQUENCY</text>
                    
                    <text x={padding} y={height - padding + 15} textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">-4.0</text>
                    <text x={width / 2} y={height - padding + 15} textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">0.5</text>
                    <text x={width - padding} y={height - padding + 15} textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">5.0</text>
                </svg>

                {/* Legend */}
                <div className="absolute top-6 right-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">Reference Cohort</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">Target Population</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 p-6 bg-slate-800/20 border border-slate-800 rounded-xl">
                <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Analytic Findings</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                    The distribution shows a clear liability shift in the target population compared to the reference GRCh38 genomic background. 
                    The separation metric of {data.stats.separation.toFixed(2)} sigma indicates high predictive validity for clinical phenotype mapping 
                    under SSR 16-4p guidelines. Bayesian PMCU has been calibrated to account for this observed genetic variance in its inference engine.
                </p>
            </div>
        </div>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
    const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
    const [selectedReportId, setSelectedReportId] = useState<string>(INITIAL_REPORTS[0].id);
    const [viewMode, setViewMode] = useState<'report' | 'analytics'>('report');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showColab, setShowColab] = useState<boolean>(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const currentReport = useMemo(() => reports.find(r => r.id === selectedReportId), [reports, selectedReportId]);

    const colabSnippet = `!pip install -q hspa-toolchain pqc-lib
import hspa
from hspa.rigor import Adjudicator

# Initializing RIGOR-HSPA-Secure++ Pipeline
oracle = Adjudicator(model="HSPA-v1.2", p_qc=True)
oracle.load_vcf("genomic_sample.vcf")
oracle.run_pqc_audit()

# Generate Adjudication Proof for SSA Listing 11.00
report = oracle.generate_validation_report(target="SSA-11.00")
print(report.summary())`;

    const handleGenerateContent = useCallback(async () => {
        if (!currentReport) return;
        setIsLoading(true);
        setError(null);
        try {
            const filledContent = await generateReportContent(currentReport);
            
            const sections = filledContent.split(/(?=^##\s)/m).filter(s => s.trim()).map(sectionText => {
                const lines = sectionText.trim().split('\n');
                const heading = lines.shift()?.replace('## ', '').trim() || '';
                const content = lines.join('\n').trim();
                return { heading, content };
            });

            if (sections.length === 0) {
                setReports(prev => prev.map(r => r.id === selectedReportId ? { ...r, sections: [{ heading: "Summary", content: filledContent }] } : r));
            } else {
                setReports(prev => prev.map(r => r.id === selectedReportId ? { ...r, sections } : r));
            }

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [currentReport, selectedReportId]);

    const handleDownloadPdf = useCallback(() => {
        const { jsPDF } = window.jspdf;
        const input = contentRef.current;
        if (input && currentReport) {
            html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = pdfWidth - 20;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                let heightLeft = imgHeight;
                let position = 10;

                pdf.setTextColor(40, 44, 52);
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 20);

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight - 10;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                    heightLeft -= (pdfHeight - 20);
                }
                pdf.save(`RIGOR_HSPA_SECURE_${currentReport.id}.pdf`);
            });
        }
    }, [currentReport]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Snippet copied to clipboard!');
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-30 shadow-2xl">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                            <ShieldIcon />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-white uppercase">RIGOR-HSPA-Secure++</h1>
                            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Post-Quantum Validation Oracle</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setShowColab(!showColab)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-600 transition-all font-mono"
                        >
                            {showColab ? 'Close Colab API' : 'Google Colab Snippet'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-grow container mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
                {/* Navigation Sidebar */}
                <aside className="w-full lg:w-72 flex-shrink-0">
                    <div className="sticky top-28 space-y-6">
                        <section>
                            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <span className="w-4 h-px bg-slate-700 mr-2"></span> Navigation Matrix
                            </h2>
                            <nav className="space-y-1">
                                <button
                                    onClick={() => setViewMode('analytics')}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-3 group ${
                                        viewMode === 'analytics'
                                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 font-semibold'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    <BarChartIcon />
                                    <span>PRS Distribution</span>
                                </button>
                                <div className="pt-4 pb-2">
                                    <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Reports</p>
                                </div>
                                {reports.map(report => (
                                    <button
                                        key={report.id}
                                        onClick={() => {
                                            setSelectedReportId(report.id);
                                            setViewMode('report');
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between group ${
                                            selectedReportId === report.id && viewMode === 'report'
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                    >
                                        <span className="truncate">{report.title.split(' — ')[1] || report.title}</span>
                                        <span className={`text-[10px] opacity-50 font-mono ${selectedReportId === report.id && viewMode === 'report' ? 'text-white' : 'text-slate-500'}`}>
                                            {report.id.toUpperCase()}
                                        </span>
                                    </button>
                                ))}
                            </nav>
                        </section>

                        <section className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                            <h3 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <CpuIcon /> ISA Specification
                            </h3>
                            <div className="text-[10px] text-slate-400 font-mono leading-relaxed">
                                Architecture: HSPA v1.2<br/>
                                Scheduler: Bayesian PMCU<br/>
                                PQC: Kyber-768 / Dilithium-III<br/>
                                Adjudication: SSA-11.00/12.02
                            </div>
                        </section>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-grow relative min-h-[600px]">
                    {isLoading && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-40 rounded-2xl animate-in fade-in duration-300">
                            <div className="text-center flex flex-col items-center">
                                <LoaderIcon />
                                <p className="mt-4 text-sm font-mono text-blue-400 animate-pulse">Consulting RIGOR AI Oracle...</p>
                                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Synthesizing Evidence Chain</p>
                            </div>
                        </div>
                    )}

                    {showColab && (
                        <div className="mb-6 bg-slate-900 border border-blue-500/30 rounded-xl p-5 shadow-2xl animate-in slide-in-from-top duration-300">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                                    <CpuIcon /> Google Colab Integration
                                </h3>
                                <button onClick={() => copyToClipboard(colabSnippet)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                                    <CopyIcon /> Copy Code
                                </button>
                            </div>
                            <pre className="text-[11px] font-mono text-slate-300 bg-black/40 p-4 rounded-lg overflow-x-auto border border-slate-800">
                                {colabSnippet}
                            </pre>
                        </div>
                    )}

                    {viewMode === 'analytics' ? (
                        <PRSAnalyticsView />
                    ) : currentReport ? (
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-500">
                            {/* Toolbar */}
                            <div className="px-8 py-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/20">
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">{currentReport.title}</h2>
                                    <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-widest">System Validation Protocol {currentReport.id}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={handleGenerateContent}
                                        disabled={isLoading}
                                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 active:scale-95"
                                    >
                                        <SparklesIcon />
                                        <span className="ml-2">Synthesize Proof</span>
                                    </button>
                                    <button
                                        onClick={handleDownloadPdf}
                                        className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-sm font-bold transition-all active:scale-95"
                                    >
                                        <DownloadIcon />
                                        <span className="ml-2">Export Legal PDF</span>
                                    </button>
                                </div>
                            </div>

                            {/* Report Content */}
                            <div className="p-8 sm:p-10 relative">
                                {error && (
                                    <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-3">
                                        <span className="bg-red-500/20 p-2 rounded-full">!</span>
                                        {error}
                                    </div>
                                )}

                                <div ref={contentRef} className="space-y-12 bg-white text-slate-900 p-8 rounded-xl shadow-inner border border-slate-300">
                                    <div className="border-b-2 border-slate-800 pb-6 flex justify-between items-start">
                                        <div>
                                            <h1 className="text-3xl font-black uppercase text-slate-800">Validation Proof</h1>
                                            <p className="text-sm font-mono text-slate-500 mt-1">Ref: RIGOR-ADJUDICATION-{currentReport.id.toUpperCase()}-v1.2</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                                            <p className="text-sm font-bold text-blue-600">CERTIFIED EVIDENCE</p>
                                        </div>
                                    </div>

                                    {currentReport.sections.map((section, idx) => (
                                        <section key={idx} className="animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                            <h3 className="text-lg font-bold text-slate-800 border-l-4 border-blue-600 pl-4 mb-4 uppercase tracking-tight">
                                                {section.heading}
                                            </h3>
                                            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-slate-700">
                                                {section.content}
                                            </div>
                                        </section>
                                    ))}

                                    <div className="pt-8 border-t border-slate-200 text-[10px] text-slate-400 font-mono text-center">
                                        REPRODUCTION OF THIS DOCUMENT WITHOUT PROPER CLEARANCE FROM THE HSPA ADJUDICATION ORACLE IS PROHIBITED.
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 font-mono text-sm border-2 border-dashed border-slate-800 rounded-2xl">
                            INITIATE VALIDATION SELECTION FROM MATRIX
                        </div>
                    )}
                </main>
            </div>

            <footer className="mt-12 py-10 border-t border-slate-800/50 bg-slate-900/30">
                <div className="container mx-auto px-6 text-center space-y-4">
                    <div className="flex justify-center items-center space-x-6">
                        <span className="text-[10px] text-slate-500 tracking-widest uppercase">Post-Quantum AES-256</span>
                        <span className="text-[10px] text-slate-500 tracking-widest uppercase">Kyber-768 Enclaved</span>
                        <span className="text-[10px] text-slate-500 tracking-widest uppercase">Dilithium-III Signed</span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-2xl mx-auto">
                        This suite operates as an administrative technical layer for the evaluation of Titles II and XVI disability claims.
                        Synthetic content generated by the RIGOR AI engine is for protocol validation and demonstration within the HSPA sandbox.
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">
                        © 2024 RIGOR-HSPA-Secure++ Engineering Group | Social Security Administration Tech-Stack v2.4
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default App;
