import { usePromptStore } from '../stores/promptStore';
import { PromptCard } from './PromptCard';
import { Loader2 } from 'lucide-react';

export function PromptGrid() {
  const { prompts, loading, error } = usePromptStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No hay prompts todavía. ¡Crea el primero!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
}