import { Plus } from 'lucide-react';
import { usePromptStore } from '../stores/promptStore';

export function FAB() {
  const { setShowCreateModal, showCreateModal } = usePromptStore();

  if (showCreateModal) return null;

  return (
    <button
      onClick={() => setShowCreateModal(true)}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}