import api from './api';
import type { User } from '@/types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  company_name: string;
  registration_number?: string;
  address?: string;
  phone?: string;
  website?: string;
  category?: string;
  tax_id?: string;
}

export const authService = {
  async login(data: LoginInput) {
    const res = await api.post<{ success: boolean; data: { user: User; token?: string } }>('/auth/login', data);
    return res.data.data;
  },
  async register(data: RegisterInput) {
    const res = await api.post<{ success: boolean; data: { user_id: number; message: string } }>('/auth/register', data);
    return res.data.data;
  },
  async logout() {
    await api.post('/auth/logout');
  },
  async me() {
    const res = await api.get<{ success: boolean; data: User }>('/auth/me');
    return res.data.data;
  },
  async refresh() {
    const res = await api.post<{ success: boolean; data: { token: string; user: User } }>('/auth/refresh');
    return res.data.data;
  },
};
