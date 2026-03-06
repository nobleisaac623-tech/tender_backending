import api, { API_BASE_URL } from './api';

export const uploadsService = {
  async upload(file: File, onProgress?: (percent: number) => void) {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post<{ success: boolean; data: { filename: string; original_name: string; file_size: number } }>(
      '/uploads/upload',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      }
    );
    return res.data.data;
  },
  downloadUrl(type: 'tender_doc' | 'bid_doc', id: number): string {
    return `${API_BASE_URL}/uploads/download?type=${type}&id=${id}`;
  },
};
