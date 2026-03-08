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

  createUser: async (data: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'evaluator' | 'supplier';
  }): Promise<User> => {
    const res = await api.post('/users/create', data);
    if (res.data.success) {
      return res.data.user;
    }
    throw new Error(res.data.message || 'Failed to create user');
  },
};
