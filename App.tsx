
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
import { aiFilterItems } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('vault');
  const [activeVault, setActiveVault] = useState<VaultType>('sports');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);
  
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

  useEffect(() => {
    const checkKey = async () => {
      const hasKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!hasKey && window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        if (!selected) {
          setNeedsKey(true);
        }
      }
    };

    checkKey();

    getAllItems().then(data => {
      setItems(data);
      setLoading(false);
    });

    const handleSwitchToSearch = () => setView('search_add');
    window.addEventListener('switch-to-search', handleSwitchToSearch);
    return () => window.removeEventListener('switch-to-search', handleSwitchToSearch);
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setNeedsKey(false);
      // Refresh items just in case
      const data = await getAllItems();
      setItems(data);
    }
  };

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
        alert("AI Search failed. Falling back to keyword search.");
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
      const matchesSearch = !searchQuery || 
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.subTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.significance.toLowerCase().includes(searchQuery.toLowerCase());

      // Manual Filters
      const matchesYear = !filters.year || i.year.includes(filters.year);
      const matchesBrand = !filters.brand || i.brand.toLowerCase().includes(filters.brand.toLowerCase());
      const matchesRarity = !filters.rarity || (i.rarity && i.rarity.toLowerCase().includes(filters.rarity.toLowerCase()));
      const matchesCondition = !filters.condition || (i.condition && i.condition.toLowerCase().includes(filters.condition.toLowerCase()));
      const matchesValue = i.estimatedValue >= filters.minValue && i.estimatedValue <= filters.maxValue;

      return matchesSearch && matchesYear && matchesBrand && matchesRarity && matchesCondition && matchesValue;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'value-high') {
        return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      }
      if (filters.sortBy === 'value-low') {
        return (a.estimatedValue || 0) - (b.estimatedValue || 0);
      }
      // Default: newest (by dateAdded)
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    });

  const totalValue = filteredItems.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

  const handleVaultSwitch = (vault: VaultType) => {
    setActiveVault(vault);
    setSearchQuery('');
    setAiFilteredIds(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (needsKey) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full space-y-6">
        <div className="text-5xl">🔑</div>
        <h2 className="text-2xl font-black text-slate-900">API Key Required</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          To use the AI features and avoid rate limits, please select a Gemini API key from a paid Google Cloud project.
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95 transition-all"
        >
          Select API Key
        </button>
        <p className="text-[10px] text-slate-400">
          See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">billing documentation</a> for details.
        </p>
      </div>
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
