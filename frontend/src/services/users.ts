import api from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'evaluator' | 'supplier';
  status: 'pending' | 'active' | 'suspended';
  created_at?: string;
  last_login?: string;
}

export const usersService = {
  listEvaluators: async (): Promise<User[]> => {
    const res = await api.get('/users/evaluators');
    if (res.data.success) {
      return res.data.evaluators;
    }
    throw new Error(res.data.message || 'Failed to fetch evaluators');
  },

  inviteEvaluator: async (data: { name: string; email: string }): Promise<{ user_id: number; email_sent: boolean; message: string }> => {
    const res = await api.post('/users/invite-evaluator', data);
    if (res.data.success) return res.data.data;
    throw new Error(res.data.message || 'Failed to invite evaluator');
  },

  approveUser: async (user_id: number): Promise<void> => {
    const res = await api.post('/users/approve', { user_id });
    if (res.data.success) return;
    throw new Error(res.data.message || 'Failed to approve user');
  },
};
