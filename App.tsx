
import React, { useState, useEffect } from 'react';
import { VaultItem, VaultType, AppView, VAULT_CONFIG } from './types';
import { getAllItems, saveItem, deleteItem } from './services/storageService';
import VaultHeader from './components/VaultHeader';
import VaultSwitcher from './components/VaultSwitcher';
import Scanner from './components/Scanner';
import ItemList from './components/ItemList';
import ItemDetail from './components/ItemDetail';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('vault');
  const [activeVault, setActiveVault] = useState<VaultType>('sports');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getAllItems();
      setItems(data);
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSaveItem = async (item: VaultItem) => {
    await saveItem(item);
    setItems(prev => [item, ...prev.filter(i => i.id !== item.id)]);
    setView('vault');
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Permanently remove from vault?")) {
      await deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setView('vault');
    }
  };

  const filteredItems = items.filter(i => i.category === activeVault);
  const totalValue = filteredItems.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col max-w-xl mx-auto shadow-2xl overflow-hidden">
      <VaultHeader 
        view={view} 
        setView={setView} 
        activeVault={activeVault}
        totalValue={totalValue}
      />

      <main className="flex-grow overflow-y-auto px-4 pb-24 pt-4">
        {view === 'vault' && (
          <>
            <VaultSwitcher 
              activeVault={activeVault} 
              setActiveVault={setActiveVault} 
            />
            <ItemList 
              items={filteredItems} 
              onSelectItem={(item) => { setSelectedItem(item); setView('item'); }}
            />
          </>
        )}

        {view === 'scan' && (
          <Scanner 
            category={activeVault} 
            onCancel={() => setView('vault')}
            onResult={handleSaveItem}
          />
        )}

        {view === 'item' && selectedItem && (
          <ItemDetail 
            item={selectedItem} 
            onUpdate={handleSaveItem}
            onDelete={() => handleDeleteItem(selectedItem.id)}
            onBack={() => setView('vault')}
          />
        )}
      </main>

      {/* Floating Action Button */}
      {view === 'vault' && (
        <button
          onClick={() => setView('scan')}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-transform z-50 border-4 border-white"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default App;
