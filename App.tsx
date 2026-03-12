
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
import SearchFilter, { FilterState } from './components/SearchFilter';
import TextSearchAdd from './components/TextSearchAdd';
import ManualAdd from './components/ManualAdd';
import { aiFilterItems } from './services/geminiService';
import ConfirmModal from './components/ConfirmModal';
import { useUI } from './context/UIContext';

const App: React.FC = () => {
  const { showMessage } = useUI();
  const [view, setView] = useState<AppView>('vault');
  const [activeVault, setActiveVault] = useState<VaultType>('sports');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    year: '',
    brand: '',
    minValue: 0,
    maxValue: 1000000,
    rarity: '',
    condition: '',
    sortBy: 'newest'
  });

  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = () => {
      const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!key || key === 'your_api_key_here' || key === '') {
        setApiKeyMissing(true);
      }
    };
    checkKey();

    getAllItems().then(data => {
      setItems(data);
      setLoading(false);
    });

    const handleSwitchToSearch = () => setView('search_add');
    const handleSwitchToManual = () => setView('manual_add');
    window.addEventListener('switch-to-search', handleSwitchToSearch);
    window.addEventListener('switch-to-manual', handleSwitchToManual);
    return () => {
      window.removeEventListener('switch-to-search', handleSwitchToSearch);
      window.removeEventListener('switch-to-manual', handleSwitchToManual);
    };
  }, []);

  const handleResult = async (item: VaultItem) => {
    await saveItem(item);
    setItems(prev => [item, ...prev.filter(i => i.id !== item.id)]);
    setSelectedItem(item);
    setView('item');
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
    setView('vault');
    setShowDeleteConfirm(null);
  };

  const handleSearch = async (query: string, isAI: boolean) => {
    setSearchQuery(query);
    if (!query) {
      setAiFilteredIds(null);
      return;
    }

    if (isAI) {
      setIsAISearching(true);
      try {
        const ids = await aiFilterItems(query, items.filter(i => i.category === activeVault));
        setAiFilteredIds(ids);
      } catch (error) {
        console.error("AI Search Error", error);
        showMessage({
          title: "Search Error",
          message: "AI Search failed. Falling back to keyword search.",
          type: 'error'
        });
        setAiFilteredIds(null);
      } finally {
        setIsAISearching(false);
      }
    } else {
      setAiFilteredIds(null);
    }
  };

  const filteredItems = items
    .filter(i => i.category === activeVault)
    .filter(i => {
      // AI Filter
      if (aiFilteredIds !== null) {
        return aiFilteredIds.includes(i.id);
      }

      // Keyword Search
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (i.title?.toLowerCase()?.includes(q)) ||
        (i.subTitle?.toLowerCase()?.includes(q)) ||
        (i.brand?.toLowerCase()?.includes(q)) ||
        (i.significance?.toLowerCase()?.includes(q));

      // Manual Filters
      const matchesYear = !filters.year || (i.year && i.year.includes(filters.year));
      const matchesBrand = !filters.brand || (i.brand?.toLowerCase()?.includes(filters.brand.toLowerCase()));
      const matchesRarity = !filters.rarity || (i.rarity?.toLowerCase()?.includes(filters.rarity.toLowerCase()));
      const matchesCondition = !filters.condition || (i.condition?.toLowerCase()?.includes(filters.condition.toLowerCase()));
      const matchesValue = (i.estimatedValue || 0) >= filters.minValue && (i.estimatedValue || 0) <= filters.maxValue;

      return !!(matchesSearch && matchesYear && matchesBrand && matchesRarity && matchesCondition && matchesValue);
    })
    .sort((a, b) => {
      if (filters.sortBy === 'value-high') {
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      }
      if (filters.sortBy === 'value-low') {
        return (a.estimatedValue || 0) - (b.estimatedValue || 0);
      }
      // Default: newest (by dateAdded)
      const dateA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
      const dateB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
      
      const validA = isNaN(dateA) ? 0 : dateA;
      const validB = isNaN(dateB) ? 0 : dateB;
      
      return validB - validA;
    });

  const totalValue = filteredItems.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

  const handleVaultSwitch = (vault: VaultType) => {
    setActiveVault(vault);
    setSearchQuery('');
    setAiFilteredIds(null);
    setFilters({
      year: '',
      brand: '',
      minValue: 0,
      maxValue: 1000000,
      rarity: '',
      condition: '',
      sortBy: 'newest'
    });
  };

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
        itemCount={filteredItems.length}
        onBack={() => setView('vault')} 
      />

      {apiKeyMissing && (
        <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
              ⚠️
            </div>
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-tight">API Key Required</p>
              <p className="text-[10px] text-amber-700 font-bold">AI features will not work until a key is selected.</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              if (window.aistudio) {
                await window.aistudio.openSelectKey();
                setApiKeyMissing(false);
              }
            }}
            className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm active:scale-95 transition-all"
          >
            Select Key
          </button>
        </div>
      )}

      <main className="flex-grow overflow-y-auto px-5 pb-32 pt-6">
        {view === 'vault' && (
          <>
            <VaultSwitcher activeVault={activeVault} setActiveVault={handleVaultSwitch} />
            <SearchFilter 
              onSearch={handleSearch} 
              onFilterChange={setFilters} 
              isSearching={isAISearching} 
            />
            <ItemList items={filteredItems} onSelectItem={(i) => { setSelectedItem(i); setView('item'); }} />
          </>
        )}

        {view === 'scan' && (
          <Scanner category={activeVault} onCancel={() => setView('vault')} onResult={handleResult} />
        )}

        {view === 'search_add' && (
          <TextSearchAdd category={activeVault} onCancel={() => setView('vault')} onResult={handleResult} />
        )}

        {view === 'manual_add' && (
          <ManualAdd category={activeVault} onCancel={() => setView('vault')} onResult={handleResult} />
        )}

        {view === 'item' && selectedItem && (
          <ItemDetail 
            item={selectedItem} 
            onUpdate={handleResult} 
            onDelete={() => setShowDeleteConfirm(selectedItem.id)} 
            onBack={() => setView('vault')} 
          />
        )}

        {view === 'reports' && (
          <Reports items={items} onRefresh={() => getAllItems().then(setItems)} />
        )}
      </main>

      <ConfirmModal 
        isOpen={!!showDeleteConfirm}
        title="Purge Item?"
        message="This action cannot be undone. This item will be permanently removed from your vault."
        confirmLabel="Purge"
        isDanger={true}
        onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        onCancel={() => setShowDeleteConfirm(null)}
      />

      <Navbar currentView={view} setView={setView} />
    </div>
  );
};

export default App;
