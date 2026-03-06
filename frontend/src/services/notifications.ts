import api from './api';
import type { Notification } from '@/types';
import type { PaginatedResponse } from '@/types';

export const notificationsService = {
  list(params?: { page?: number; per_page?: number; unread_only?: boolean }) {
    return api
      .get<{ success: boolean; data: PaginatedResponse<Notification> }>('/notifications', { params })
      .then((r) => r.data.data);
  },
  markRead(id: number) {
    return api.post('/notifications/read', { id });
  },
  markReadMany(ids: number[]) {
    return api.post('/notifications/read', { ids });
  },
};
