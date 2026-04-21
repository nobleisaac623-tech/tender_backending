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
  categories?: string[];
  tax_id?: string;
}

// ✅ FIXED: Proper discriminated union type for login responses
export type LoginResponse =
  | { success: true; data: { user: User; token?: string } }
  | { success: false; message: string };

export const authService = {
  async login(data: LoginInput): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', data);
    return res.data;
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
  async setPassword(data: { token: string; password: string }) {
    const res = await api.post<{ success: boolean; data: { message: string; status?: string; role?: string } }>(
      '/auth/set-password',
      data
    );
    return res.data.data;
  },
};
