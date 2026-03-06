import api from './api';
import type { Evaluation } from '@/types';

export const evaluationsService = {
  list(params: { tender_id?: number; bid_id?: number }) {
    return api.get<Evaluation[]>('/evaluations', { params }).then((r) => r.data as unknown as Evaluation[]);
  },
  score(bidId: number, scores: Array<{ criteria_id: number; score: number; comment?: string }>) {
    return api.post('/evaluations/score', { bid_id: bidId, scores });
  },
  update(id: number, data: { score?: number; comment?: string }) {
    return api.put('/evaluations/update', { id, ...data });
  },
  finalize(tenderId: number) {
    return api.post<{ success: boolean; data: { rankings?: unknown[] } }>('/evaluations/finalize', { tender_id: tenderId }).then((r) => r.data.data);
  },
};
