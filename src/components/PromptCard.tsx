import { Prompt } from '../types';
import { Heart, Image } from 'lucide-react';
import { usePromptStore } from '../stores/promptStore';

interface Props {
  prompt: Prompt;
}

const categoryColors: Record<string, string> = {
  IMAGEN: 'bg-emerald-500',
  VIDEO: 'bg-purple-500',
  TEXTO: 'bg-blue-500',
  AUDIO: 'bg-orange-500',
};

export function PromptCard({ prompt }: Props) {
  const { setSelectedPrompt } = usePromptStore();

  return (
    <div
      onClick={() => setSelectedPrompt(prompt)}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${categoryColors[prompt.category] || 'bg-slate-500'}`}>
            {prompt.category}
          </span>
          {prompt.image_url && (
            <Image className="w-4 h-4 text-slate-400" />
          )}
        </div>

        {prompt.is_favorite && (
          <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
        )}
      </div>

      <h3 className="mt-2 font-medium text-slate-800 truncate">
        {prompt.title || prompt.content.slice(0, 50)}
      </h3>

      {prompt.description && (
        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
          {prompt.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {prompt.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}