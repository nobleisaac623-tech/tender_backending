import api from './api';

export interface TenderReportSummaryItem {
  supplier_name: string;
  company_name: string;
  criteria_scores: Record<string, number>;
  total_score: number;
  weighted_score: number;
  rank: number;
}

export interface TenderReportDetailedItem {
  supplier_name: string;
  company_name: string;
  evaluator_name: string;
  criteria_name: string;
  score: number;
  max_score: number;
  comment: string;
}

export interface TenderReportData {
  tender: { id: number; reference_number?: string };
  rankings: unknown[];
  summary: TenderReportSummaryItem[];
  detailed: TenderReportDetailedItem[];
}

export const reportsService = {
  getTenderReport(tenderId: number) {
    return api
      .get<{ success: boolean; data: TenderReportData }>('/reports/tender-report', {
        params: { tender_id: tenderId },
      })
      .then((r) => r.data.data);
  },
};
