import api from './api';
import type { RatingsResponse, SupplierRating, CreateRatingPayload } from '@/types';

export const ratingService = {
  create(data: CreateRatingPayload) {
    return api.post<{ success: boolean; data: { id: number } }>('/ratings/create', data).then((r) => r.data.data);
  },

  list(supplier_id?: number) {
    const params = supplier_id != null ? { supplier_id } : {};
    return api
      .get<{ success: boolean; data: RatingsResponse }>('/ratings', { params })
      .then((r) => r.data.data);
  },

  show(id: number) {
    return api
      .get<{ success: boolean; data: SupplierRating }>(`/ratings/show?id=${id}`)
      .then((r) => r.data.data);
  },

  getByContractId(contract_id: number) {
    return api
      .get<{ success: boolean; data: SupplierRating | null }>(`/ratings/by-contract?contract_id=${contract_id}`)
      .then((r) => r.data.data);
  },
};
