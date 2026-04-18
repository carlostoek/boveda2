import { Prompt, CreatePromptPayload, UpdatePromptPayload } from '../types';

const API_URL = '/api';

export const api = {
  async getPrompts(params?: { category?: string; search?: string; favorites?: boolean }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.favorites) query.set('favorites', 'true');

    const res = await fetch(`${API_URL}/prompts?${query}`);
    return res.json();
  },

  async getPrompt(id: string): Promise<Prompt> {
    const res = await fetch(`${API_URL}/prompts/${id}`);
    return res.json();
  },

  async createPrompt(payload: CreatePromptPayload) {
    const formData = new FormData();
    formData.append('content', payload.content);
    formData.append('analyze', payload.analyze.toString());
    if (payload.image) {
      formData.append('image', payload.image);
    }

    const res = await fetch(`${API_URL}/prompts`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async updatePrompt(id: string, payload: UpdatePromptPayload) {
    const formData = new FormData();
    if (payload.content) formData.append('content', payload.content);
    if (payload.title) formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    if (payload.reanalyze) formData.append('reanalyze', 'true');

    const res = await fetch(`${API_URL}/prompts/${id}`, {
      method: 'PUT',
      body: formData,
    });
    return res.json();
  },

  async deletePrompt(id: string) {
    await fetch(`${API_URL}/prompts/${id}`, { method: 'DELETE' });
  },

  async toggleFavorite(id: string) {
    const res = await fetch(`${API_URL}/prompts/${id}/favorite`, {
      method: 'POST',
    });
    return res.json();
  },

  async getTags() {
    const res = await fetch(`${API_URL}/tags`);
    return res.json();
  },

  async suggestTags(q: string) {
    const res = await fetch(`${API_URL}/tags/suggest?q=${encodeURIComponent(q)}`);
    return res.json();
  },
};