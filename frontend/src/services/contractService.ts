import api, { API_BASE_URL } from './api';
import type {
  Contract,
  ContractListItem,
  ContractMilestone,
  ContractDocument,
  AwardedTenderForContract,
} from '@/types';

export const contractService = {
  list(params?: { status?: string; supplier_id?: number; search?: string }) {
    return api
      .get<{ success: boolean; data: ContractListItem[] }>('/contracts', { params })
      .then((r) => r.data.data);
  },

  show(id: number) {
    return api
      .get<{ success: boolean; data: Contract }>(`/contracts/show?id=${id}`)
      .then((r) => r.data.data);
  },

  create(data: {
    tender_id: number;
    supplier_id: number;
    title: string;
    description?: string;
    contract_value: number;
    start_date: string;
    end_date: string;
    milestones?: Array<{ title: string; description?: string; due_date: string }>;
  }) {
    return api
      .post<{ success: boolean; data: { id: number; contract_number: string } }>('/contracts/create', data)
      .then((r) => r.data.data);
  },

  update(data: Partial<Contract> & { id: number }) {
    return api.put('/contracts/update', data);
  },

  sign(contract_id: number, role: 'admin' | 'supplier') {
    return api
      .post<{ success: boolean; data: { message: string; both_signed: boolean } }>('/contracts/sign', {
        contract_id,
        role,
      })
      .then((r) => r.data.data);
  },

  milestoneCreate(data: { contract_id: number; title: string; description?: string; due_date: string }) {
    return api
      .post<{ success: boolean; data: { id: number } }>('/contracts/milestones/create', data)
      .then((r) => r.data.data);
  },

  milestoneUpdate(data: Partial<ContractMilestone> & { id: number }) {
    return api.put('/contracts/milestones/update', data);
  },

  documentUpload(contractId: number, file: File, document_type: string) {
    const form = new FormData();
    form.append('contract_id', String(contractId));
    form.append('document_type', document_type);
    form.append('file', file);
    return api
      .post<{ success: boolean; data: { id: number; original_name: string } }>('/contracts/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  documentDownloadUrl(id: number): string {
    return `${API_BASE_URL}/contracts/documents/download?id=${id}`;
  },

  getAwardedTendersForContract() {
    return api
      .get<{ success: boolean; data: AwardedTenderForContract[] }>('/tenders/awarded-for-contract')
      .then((r) => r.data.data);
  },

  getContractIdByTenderId(tenderId: number) {
    return api
      .get<{ success: boolean; data: { contract_id: number } | null }>(`/contracts/by-tender?tender_id=${tenderId}`)
      .then((r) => r.data.data?.contract_id ?? null);
  },
};
