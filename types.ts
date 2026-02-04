
export interface ReportSection {
    heading: string;
    content: string;
}

export interface Report {
    id: string;
    title: string;
    sections: ReportSection[];
    context?: string;
}

export interface SnpData {
    rsid: string;
    chromosome: string;
    position: number;
    genotype: string;
}
