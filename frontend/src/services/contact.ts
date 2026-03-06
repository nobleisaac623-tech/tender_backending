import api from './api';

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export interface SendContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const contactService = {
  async submit(data: ContactInput) {
    const res = await api.post<{ success: boolean; data: { message: string } }>('/contact', data);
    return res.data.data;
  },

  async sendContactMessage(data: SendContactMessageInput) {
    const res = await api.post<{ success: boolean; data?: { message: string } }>(
      '/contact/send',
      data
    );
    return res.data;
  },
};
