
import React, { useState, useEffect } from 'react';
import { VaultItem, VaultType, AppView, VAULT_CONFIG } from './types';
import { getAllItems, saveItem, deleteItem } from './services/storageService';
import VaultHeader from './components/VaultHeader';
import VaultSwitcher from './components/VaultSwitcher';
import Scanner from './components/Scanner';
import ItemList from './components/ItemList';
import ItemDetail from './components/ItemDetail';
import Navbar from './components/Navbar';
import Reports from './components/Reports';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('vault');
  const [activeVault, setActiveVault] = useState<VaultType>('sports');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllItems().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const handleResult = async (item: VaultItem) => {
    await saveItem(item);
    setItems(prev => [item, ...prev.filter(i => i.id !== item.id)]);
    setView('vault');
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this from your vault?")) {
      await deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      setView('vault');
    }
  };

  const vaultItems = items.filter(i => i.category === activeVault);
  const totalValue = vaultItems.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col max-w-lg mx-auto shadow-2xl overflow-hidden font-sans">
      <VaultHeader 
        view={view} 
        activeVault={activeVault} 
        totalValue={totalValue} 
        onBack={() => setView('vault')} 
      />

      <main className="flex-grow overflow-y-auto px-5 pb-32 pt-6">
        {view === 'vault' && (
          <>
            <VaultSwitcher activeVault={activeVault} setActiveVault={setActiveVault} />
            <ItemList items={vaultItems} onSelectItem={(i) => { setSelectedItem(i); setView('item'); }} />
          </>
        )}

        {view === 'scan' && (
          <Scanner category={activeVault} onCancel={() => setView('vault')} onResult={handleResult} />
        )}

        {view === 'item' && selectedItem && (
          <ItemDetail 
            item={selectedItem} 
            onUpdate={handleResult} 
            onDelete={() => handleDelete(selectedItem.id)} 
            onBack={() => setView('vault')} 
          />
        )}

        {view === 'reports' && (
          <Reports items={items} />
        )}
      </main>

      <Navbar currentView={view} setView={setView} />
    </div>
  );
};

export default App;
