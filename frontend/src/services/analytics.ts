import api from './api';

export interface AnalyticsData {
  tenders_by_status: Array<{ status: string; count: number }>;
  bids_per_tender: Array<{ tender_title: string; bid_count: number }>;
  supplier_registrations: Array<{ month: string; count: number }>;
  evaluation_completion: { completed: number; pending: number };
  summary: {
    total_tenders: number;
    total_suppliers: number;
    total_bids: number;
    pending_approvals: number;
  };
}

export const analyticsService = {
  getAnalytics() {
    return api
      .get<{ success: boolean; data: AnalyticsData }>('/reports/analytics')
      .then((r) => r.data.data);
  },
};
