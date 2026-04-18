export interface Prompt {
  id: string;
  title: string | null;
  description: string | null;
  content: string;
  category: 'IMAGEN' | 'VIDEO' | 'TEXTO' | 'AUDIO';
  subcategory: string | null;
  metadata: Record<string, unknown> | null;
  image_url: string | null;
  is_favorite: boolean;
  analysis_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'MANUAL';
  analysis_result: Record<string, unknown> | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type Category = 'IMAGEN' | 'VIDEO' | 'TEXTO' | 'AUDIO';

export interface CreatePromptPayload {
  content: string;
  analyze: boolean;
  image?: File;
}

export interface UpdatePromptPayload {
  content?: string;
  title?: string;
  description?: string;
  reanalyze?: boolean;
}