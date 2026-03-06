import api from './api';
import type { BlacklistRecord } from '@/types';

export const blacklistService = {
  getList(activeOnly = false) {
    return api
      .get<{ success: boolean; data: { items: BlacklistRecord[] } }>(`/blacklist?active=${activeOnly ? 1 : 0}`)
      .then((r) => r.data.data.items);
  },

  check(supplierId: number) {
    return api
      .get<{
        success: boolean;
        data: { blacklisted: boolean; blacklist_id?: number; reason?: string; supplier_name?: string; supplier_email?: string };
      }>(`/blacklist/check?supplier_id=${supplierId}`)
      .then((r) => r.data.data);
  },

  add(supplierId: number, reason: string) {
    return api
      .post<{ success: boolean; data: { blacklist: BlacklistRecord } }>('/blacklist/add', { supplier_id: supplierId, reason })
      .then((r) => r.data.data);
  },

  lift(blacklistId: number, liftReason: string) {
    return api.post<{ success: boolean; data: { message: string } }>('/blacklist/lift', {
      blacklist_id: blacklistId,
      lift_reason: liftReason,
    });
  },
};
