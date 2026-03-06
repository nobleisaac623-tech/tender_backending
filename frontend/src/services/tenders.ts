import api from './api';
import type { Tender } from '@/types';
import type { PaginatedResponse } from '@/types';

export const tendersService = {
  listPublic(params?: { category_id?: number; tag?: string; search?: string }) {
    return api.get<{ success: boolean; data: Tender[] }>('/tenders/public', { params }).then((r) => r.data.data);
  },
  list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    category_id?: number;
    tag?: string;
  }) {
    return api
      .get<{ success: boolean; data: PaginatedResponse<Tender> }>('/tenders', { params })
      .then((r) => r.data.data);
  },
  show(id: number) {
    return api.get<{ success: boolean; data: Tender }>(`/tenders/show?id=${id}`).then((r) => r.data.data);
  },
  /** Public (no auth): get one published tender by id */
  showPublic(id: number) {
    return api.get<{ success: boolean; data: Tender }>(`/tenders/public-show?id=${id}`).then((r) => r.data.data);
  },
  create(data: Omit<Partial<Tender>, 'criteria'> & { criteria?: Array<{ name: string; description?: string; max_score?: number; weight?: number }> }) {
    return api.post<{ success: boolean; data: { id: number } }>('/tenders/create', data).then((r) => r.data.data);
  },
  update(data: Partial<Tender> & { id: number }) {
    return api.put('/tenders/update', data);
  },
  delete(id: number) {
    return api.delete(`/tenders/delete?id=${id}`);
  },
  publish(id: number) {
    return api.post('/tenders/publish', { id });
  },
  close(id: number) {
    return api.post('/tenders/close', { id });
  },
  award(tenderId: number, bidId: number) {
    return api.post<{ success: boolean; data: { supplier_id: number } }>('/tenders/award', { tender_id: tenderId, bid_id: bidId }).then((r) => r.data.data);
  },
  addDocument(tenderId: number, file: { filename: string; original_name: string; file_size: number }) {
    return api.post('/tenders/documents', { tender_id: tenderId, ...file });
  },
  assignEvaluators(tenderId: number, evaluatorIds: number[]) {
    return api.post('/tenders/evaluators', { tender_id: tenderId, evaluator_ids: evaluatorIds });
  },
};
