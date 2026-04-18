import { usePromptStore } from '../stores/promptStore';
import { X, Heart, Copy, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api';

const categoryLabels: Record<string, string> = {
  IMAGEN: 'Imagen',
  VIDEO: 'Video',
  TEXTO: 'Texto',
  AUDIO: 'Audio',
};

const categoryColors: Record<string, string> = {
  IMAGEN: 'bg-emerald-500',
  VIDEO: 'bg-purple-500',
  TEXTO: 'bg-blue-500',
  AUDIO: 'bg-orange-500',
};

export function DetailModal() {
  const { showDetailModal, selectedPrompt, setSelectedPrompt, toggleFavorite, deletePrompt, updatePrompt } = usePromptStore();
  const [showEdit, setShowEdit] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  if (!showDetailModal || !selectedPrompt) return null;

  const prompt = selectedPrompt;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
  };

  const handleDelete = async () => {
    if (confirm('¿Seguro que quieres eliminar este prompt?')) {
      await deletePrompt(prompt.id);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setLoading(true);
    try {
      await updatePrompt(prompt.id, editContent, false);
      setShowEdit(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPrompt(null);
    setShowEdit(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${categoryColors[prompt.category] || 'bg-slate-500'}`}>
              {categoryLabels[prompt.category] || prompt.category}
            </span>
            {prompt.subcategory && (
              <span className="text-xs text-slate-500">{prompt.subcategory}</span>
            )}
          </div>

          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {prompt.image_url && (
          <div className="border-b">
            <img
              src={prompt.image_url}
              alt="Prompt"
              className="w-full h-64 object-contain bg-slate-100"
            />
          </div>
        )}

        <div className="p-4 space-y-4">
          {showEdit ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-40 p-3 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <>
              {prompt.title && <h2 className="text-lg font-semibold">{prompt.title}</h2>}
              {prompt.description && <p className="text-sm text-slate-600">{prompt.description}</p>}
            </>
          )}

          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="whitespace-pre-wrap text-sm">{prompt.content}</p>
          </div>

          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {prompt.tags.map((tag) => (
                <span key={tag} className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {prompt.analysis_status === 'PENDING' && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analizando...
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t">
            <button
              onClick={() => toggleFavorite(prompt.id)}
              className={`p-2 rounded-lg ${prompt.is_favorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
            >
              <Heart className={`w-5 h-5 ${prompt.is_favorite ? 'fill-current' : ''}`} />
            </button>

            <button onClick={handleCopy} className="p-2 text-slate-400 hover:text-blue-500">
              <Copy className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setShowEdit(true);
                setEditContent(prompt.content);
              }}
              className="p-2 text-slate-400 hover:text-blue-500"
            >
              <Edit2 className="w-5 h-5" />
            </button>

            <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {showEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}