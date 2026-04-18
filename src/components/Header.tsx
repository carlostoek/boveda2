import { usePromptStore } from '../stores/promptStore';
import { Search, Heart, Plus } from 'lucide-react';

export function Header() {
  const { filters, setFilters, setShowCreateModal, fetchPrompts } = usePromptStore();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-800">PromptVault</h1>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar prompts..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && fetchPrompts()}
              />
            </div>

            <button
              onClick={() => setFilters({ favorites: !filters.favorites })}
              className={`p-2 rounded-lg border ${filters.favorites ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <Heart className={`w-5 h-5 ${filters.favorites ? 'fill-current' : ''}`} />
            </button>

            <select
              value={filters.category}
              onChange={(e) => setFilters({ category: e.target.value as any })}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="IMAGEN">Imagen</option>
              <option value="VIDEO">Video</option>
              <option value="TEXTO">Texto</option>
              <option value="AUDIO">Audio</option>
            </select>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>
    </header>
  );
}