import api from './api';
import type { User } from '@/types';
import type { PaginatedResponse } from '@/types';

export const suppliersService = {
  list(params?: { page?: number; per_page?: number; search?: string; status?: string; blacklisted_only?: boolean }) {
    return api
      .get<{ success: boolean; data: PaginatedResponse<User & { company_name?: string; is_approved?: boolean; is_blacklisted?: boolean }> }>('/suppliers', { params })
      .then((r) => r.data.data);
  },
  show(id?: number) {
    const q = id != null ? `?id=${id}` : '';
    return api.get<{ success: boolean; data: User }>(`/suppliers/show${q}`).then((r) => r.data.data);
  },
  update(data: Record<string, unknown>) {
    return api.put('/suppliers/update', data);
  },
  approve(supplierId: number, action: 'approve' | 'suspend') {
    return api.post('/suppliers/approve', { supplier_id: supplierId, action });
  },
};
