import { useEffect } from 'react';
import { usePromptStore } from './stores/promptStore';
import { Header } from './components/Header';
import { PromptGrid } from './components/PromptGrid';
import { CreateModal } from './components/CreateModal';
import { DetailModal } from './components/DetailModal';
import { FAB } from './components/FAB';
import { Toast } from './components/Toast';

export default function App() {
  const { fetchPrompts, showCreateModal, showDetailModal } = usePromptStore();

  useEffect(() => {
    fetchPrompts();
    const interval = setInterval(fetchPrompts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <PromptGrid />
      </main>
      <FAB />
      {showCreateModal && <CreateModal />}
      {showDetailModal && <DetailModal />}
      <Toast />
    </div>
  );
}