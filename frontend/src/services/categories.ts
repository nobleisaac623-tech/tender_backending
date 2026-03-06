import api from './api';
import type { TenderCategory } from '@/types';

export interface TenderCategoryWithCount extends TenderCategory {
  tender_count: number;
}

export const getCategories = () =>
  api.get<{ success: boolean; data: TenderCategory[] }>('/categories').then((r) => r.data.data);

export const categoriesService = {
  listAdmin() {
    return api
      .get<{ success: boolean; data: TenderCategoryWithCount[] }>('/categories/admin')
      .then((r) => r.data.data);
  },
  create(data: { name: string; description?: string; color?: string }) {
    return api.post<{ success: boolean; data: { id: number } }>('/categories/create', data).then((r) => r.data.data);
  },
  update(data: { id: number; name: string; description?: string; color?: string }) {
    return api.put('/categories/update', data);
  },
  delete(id: number) {
    return api.delete(`/categories/delete?id=${id}`);
  },
};
