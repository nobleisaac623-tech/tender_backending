import api from './api';

export interface Appeal {
  id: number;
  supplier_id: number | null;
  supplier_email: string;
  supplier_name: string | null;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
}

export interface AppealsResponse {
  appeals: Appeal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const appealsService = {
  list: async (params?: { status?: string; page?: number; limit?: number }): Promise<AppealsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const response = await api.get<AppealsResponse>(`/appeals?${searchParams.toString()}`);
    return response.data;
  },

  update: async (appealId: number, action: 'review' | 'resolve', adminNotes?: string, liftSuspension?: boolean) => {
    const response = await api.put('/appeals/update.php', {
      appeal_id: appealId,
      action,
      admin_notes: adminNotes,
      lift_suspension: liftSuspension
    });
    return response.data;
  }
};
