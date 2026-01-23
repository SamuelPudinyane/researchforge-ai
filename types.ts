export enum AgentType {
  GATHERER = 'DataGatherer',
  ANALYZER = 'Analyzer',
  SYNTHESIZER = 'Synthesizer',
  SYSTEM = 'System',
}

export enum ResearchStatus {
  IDLE = 'IDLE',
  GATHERING = 'GATHERING',
  ANALYZING = 'ANALYZING',
  SYNTHESIZING = 'SYNTHESIZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface ResearchConfig {
  topic: string;
  depth: 'Basic' | 'Advanced' | 'Expert';
  constraints: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  agent: AgentType;
  message: string;
  details?: string; // Collapsible technical details
}

export interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
}

export interface ResearchReport {
  title: string;
  executiveSummary: string;
  sections: {
    heading: string;
    content: string; // Markdown
  }[];
  keyInsights: string[];
  recommendations: string[];
  chartData: {
    title: string;
    data: ChartDataPoint[];
    type: 'bar' | 'pie' | 'line';
    xAxisLabel?: string;
    yAxisLabel?: string;
  }[];
  citations: string[];
}
