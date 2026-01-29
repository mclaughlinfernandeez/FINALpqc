
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
