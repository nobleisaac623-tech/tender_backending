import api from './api';
import type { Bid } from '@/types';
import type { PaginatedResponse } from '@/types';

export const bidsService = {
  list(params?: { page?: number; per_page?: number; tender_id?: number }) {
    return api
      .get<{ success: boolean; data: PaginatedResponse<Bid> }>('/bids', { params })
      .then((r) => r.data.data);
  },
  show(id: number) {
    return api.get<{ success: boolean; data: Bid }>(`/bids/show?id=${id}`).then((r) => r.data.data);
  },
  submit(data: { tender_id: number; bid_amount?: number; technical_proposal?: string; submit: boolean }) {
    return api.post<{ success: boolean; data: { id: number; status: string; message?: string } }>('/bids/submit', data).then((r) => r.data.data);
  },
  update(data: { id: number; bid_amount?: number; technical_proposal?: string }) {
    return api.put('/bids/update', data);
  },
};
