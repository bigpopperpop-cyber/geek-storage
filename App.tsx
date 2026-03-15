
import React, { useState, useEffect } from 'react';
import { VaultItem, VaultType, AppView, VAULT_CONFIG } from './types';
import { getAllItems, saveItem, deleteItem, getStorageEstimate } from './services/storageService';
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
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      const estimate = await getStorageEstimate();
      if (estimate && estimate.percent > 85) {
        setStorageWarning(true);
      }
    };
    checkStorage();

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
    }).catch(err => {
      console.error("Failed to load items:", err);
      setLoading(false);
      showMessage({
        title: "Load Error",
        message: "Could not load your collection from local storage.",
        type: 'error'
      });
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

  const handleResult = React.useCallback(async (item: VaultItem) => {
    try {
      await saveItem(item);
      setItems(prev => [item, ...prev.filter(i => i.id !== item.id)]);
      setSelectedItem(item);
      // If we are in treasure view and the item is not treasure, we might want to stay in treasure view
      // but usually we want to see the item detail.
      setView('item');
      showMessage({
        title: "Saved",
        message: `${item.title} has been saved to your vault.`,
        type: 'success'
      });
    } catch (error: any) {
      console.error("Save Error", error);
      const isQuotaError = error?.name === 'QuotaExceededError' || error?.message?.includes('quota');
      showMessage({
        title: "Save Failed",
        message: isQuotaError 
          ? "Storage quota exceeded. Your vault is full. Go to the 'Data' tab and use 'Repair & Optimize' to free up space."
          : `Could not save item: ${error?.message || 'Unknown error'}. If this persists, try the 'Repair' tool in the Data tab.`,
        type: 'error'
      });
    }
  }, [showMessage]);

  const handleToggleTreasure = React.useCallback(async (item: VaultItem) => {
    const updated = { ...item, isTreasure: !item.isTreasure };
    try {
      await saveItem(updated);
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      if (selectedItem?.id === item.id) setSelectedItem(updated);
      showMessage({
        title: updated.isTreasure ? "Added to Treasure Box" : "Removed from Treasure Box",
        message: `${item.title} status updated.`,
        type: 'success'
      });
    } catch (error) {
      console.error("Treasure Toggle Error", error);
      showMessage({
        title: "Update Failed",
        message: "Could not update treasure status.",
        type: 'error'
      });
    }
  }, [selectedItem, showMessage]);

  const handleShareTreasure = React.useCallback(async () => {
    const treasureItems = items.filter(i => i.isTreasure);
    if (treasureItems.length === 0) {
      showMessage({
        title: "Empty Treasure Box",
        message: "Add some items to your Treasure Box before sharing!",
        type: 'info'
      });
      return;
    }

    const totalTreasureValue = treasureItems.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
    const itemSummary = treasureItems
      .map(i => `• ${i.title} (${i.year}) - $${(i.estimatedValue || 0).toLocaleString()}`)
      .join('\n');
    
    const summary = `💎 MY TREASURE BOX SUMMARY 💎\n\nTotal Value: $${totalTreasureValue.toLocaleString()}\nItems: ${treasureItems.length}\n\n${itemSummary}\n\nCheck out my collection on Vault AI!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Vault AI Treasure Box',
          text: summary,
          url: window.location.href
        });
      } catch (err) {
        console.error('Share error:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(summary);
        showMessage({
          title: "Copied to Clipboard",
          message: "Treasure Box summary copied! You can now paste it anywhere.",
          type: 'success'
        });
      } catch (err) {
        showMessage({
          title: "Copy Failed",
          message: "Failed to copy treasure list.",
          type: 'error'
        });
      }
    }
  }, [items, showMessage]);

  const handleDelete = React.useCallback(async (id: string) => {
    try {
      await deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      setSelectedItem(null);
      setView('vault');
      setShowDeleteConfirm(null);
      showMessage({
        title: "Deleted",
        message: "Item removed from your vault.",
        type: 'success'
      });
    } catch (error) {
      console.error("Delete Error", error);
      showMessage({
        title: "Delete Failed",
        message: "Could not remove item. Please try again.",
        type: 'error'
      });
    }
  }, [showMessage]);

  const handleSearch = React.useCallback(async (query: string, isAI: boolean) => {
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
  }, [items, activeVault, showMessage]);

  const filteredItems = React.useMemo(() => {
    try {
      return items
        .filter(i => {
          if (!i) return false;
          if (view === 'treasure') return i.isTreasure;
          return i.category === activeVault;
        })
        .filter(i => {
          try {
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
            const matchesYear = !filters.year || (i.year && String(i.year).includes(filters.year));
            const matchesBrand = !filters.brand || (i.brand?.toLowerCase()?.includes(filters.brand.toLowerCase()));
            const matchesRarity = !filters.rarity || (i.rarity?.toLowerCase()?.includes(filters.rarity.toLowerCase()));
            const matchesCondition = !filters.condition || (i.condition?.toLowerCase()?.includes(filters.condition.toLowerCase()));
            const matchesValue = (i.estimatedValue || 0) >= filters.minValue && (i.estimatedValue || 0) <= filters.maxValue;

            return !!(matchesSearch && matchesYear && matchesBrand && matchesRarity && matchesCondition && matchesValue);
          } catch (e) {
            console.error("Filter error for item:", i, e);
            return false;
          }
        })
        .sort((a, b) => {
          try {
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
          } catch (e) {
            return 0;
          }
        });
    } catch (e) {
      console.error("Global filter error:", e);
      return [];
    }
  }, [items, activeVault, aiFilteredIds, searchQuery, filters, view]);

  const totalValue = React.useMemo(() => 
    filteredItems.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0)
  , [filteredItems]);

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
        onShare={handleShareTreasure}
      />

      {storageWarning && (
        <div className="bg-red-50 border-b border-red-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              💾
            </div>
            <div>
              <p className="text-xs font-black text-red-900 uppercase tracking-tight">Storage Almost Full</p>
              <p className="text-[10px] text-red-700 font-bold">Your vault is reaching its capacity. Use the Repair tool in Data tab.</p>
            </div>
          </div>
          <button 
            onClick={() => setView('reports')}
            className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm active:scale-95 transition-all"
          >
            Fix Now
          </button>
        </div>
      )}

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
        {(view === 'vault' || view === 'treasure') && (
          <>
            {view === 'vault' && <VaultSwitcher activeVault={activeVault} setActiveVault={handleVaultSwitch} />}
            <SearchFilter 
              onSearch={handleSearch} 
              onFilterChange={setFilters} 
              isSearching={isAISearching} 
            />
            <ItemList 
              items={filteredItems} 
              onSelectItem={(i) => { setSelectedItem(i); setView('item'); }} 
              onToggleTreasure={handleToggleTreasure}
              isTreasureView={view === 'treasure'}
            />
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
