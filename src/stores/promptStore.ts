import { create } from 'zustand';
import { Prompt, Category } from '../types';
import { api } from '../services/api';

interface PromptStore {
  prompts: Prompt[];
  loading: boolean;
  error: string | null;
  selectedPrompt: Prompt | null;
  showCreateModal: boolean;
  showDetailModal: boolean;
  filters: {
    category: Category | '';
    search: string;
    favorites: boolean;
  };

  fetchPrompts: () => Promise<void>;
  setSelectedPrompt: (prompt: Prompt | null) => void;
  setShowCreateModal: (show: boolean) => void;
  setShowDetailModal: (show: boolean) => void;
  setFilters: (filters: Partial<PromptStore['filters']>) => void;
  createPrompt: (content: string, analyze: boolean, image?: File) => Promise<void>;
  updatePrompt: (id: string, content: string, reanalyze: boolean) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],
  loading: false,
  error: null,
  selectedPrompt: null,
  showCreateModal: false,
  showDetailModal: false,
  filters: {
    category: '',
    search: '',
    favorites: false,
  },

  fetchPrompts: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const prompts = await api.getPrompts({
        category: filters.category || undefined,
        search: filters.search || undefined,
        favorites: filters.favorites,
      });
      set({ prompts, loading: false });
    } catch (e) {
      set({ error: 'Error fetching prompts', loading: false });
    }
  },

  setSelectedPrompt: (prompt) => set({ selectedPrompt: prompt, showDetailModal: !!prompt }),
  setShowCreateModal: (show) => set({ showCreateModal: show }),
  setShowDetailModal: (show) => set({ showDetailModal: show }),

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().fetchPrompts();
  },

  createPrompt: async (content, analyze, image) => {
    try {
      await api.createPrompt({ content, analyze, image });
      await get().fetchPrompts();
    } catch (e) {
      throw e;
    }
  },

  updatePrompt: async (id, content, reanalyze) => {
    try {
      await api.updatePrompt(id, { content, reanalyze });
      await get().fetchPrompts();
      if (get().selectedPrompt?.id === id) {
        const updated = await api.getPrompt(id);
        set({ selectedPrompt: updated });
      }
    } catch (e) {
      throw e;
    }
  },

  deletePrompt: async (id) => {
    await api.deletePrompt(id);
    await get().fetchPrompts();
    set({ selectedPrompt: null, showDetailModal: false });
  },

  toggleFavorite: async (id) => {
    const updated = await api.toggleFavorite(id);
    set({
      prompts: get().prompts.map((p) => (p.id === id ? updated : p)),
      selectedPrompt: get().selectedPrompt?.id === id ? updated : get().selectedPrompt,
    });
  },
}));