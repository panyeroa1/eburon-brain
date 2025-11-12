
export interface AnalysisStep {
  message: string;
  status: 'pending' | 'completed' | 'error';
}

export interface AnalysisResult {
  verdict: 'Likely AI-Generated' | 'Likely Real' | 'Inconclusive';
  confidence: number;
  summary: string;
  full_report: string;
  methodology_note: string;
  web_sources: { uri: string; title: string; }[];
}

export interface HistoryItem extends AnalysisResult {
    id: string;
    timestamp: string;
    description: string;
}