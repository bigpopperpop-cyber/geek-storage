
import React, { useState, useEffect } from 'react';
import { CollectionItem, AppView, VaultType } from './types';
import Navbar from './components/Navbar';
import ItemCard from './components/ItemCard';
import ItemForm from './components/ComicForm';
import Reports from './components/Reports';
import VaultSwitcher from './components/VaultSwitcher';
import Instructions from './components/Instructions';
import * as storage from './services/storageService';

const OLD_STORAGE_KEY = 'comicvault_data_v2';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('collection');
  const [activeVault, setActiveVault] = useState<VaultType>('comics');
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Initial Load & Migration
  useEffect(() => {
    const loadData = async () => {
      try {
        let currentItems = await storage.getAllItems();
        
        // Check for migration from LocalStorage
        const savedOld = localStorage.getItem(OLD_STORAGE_KEY);
        if (savedOld && currentItems.length === 0) {
          try {
            const legacyItems: CollectionItem[] = JSON.parse(savedOld);
            console.log(`Migrating ${legacyItems.length} items to IndexedDB...`);
            for (const item of legacyItems) {
              await storage.saveItem(item);
            }
            currentItems = await storage.getAllItems();
            localStorage.removeItem(OLD_STORAGE_KEY);
            setToastMessage("Storage optimized for high volume! 🚀");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
          } catch (e) {
            console.error("Migration failed", e);
          }
        }
        
        setItems(currentItems);
      } catch (err) {
        console.error("Failed to load vault:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddItem = async (item: CollectionItem) => {
    try {
      await storage.saveItem(item);
      setItems(prev => [item, ...prev]);
      setView('collection');
    } catch (err) {
      console.error("Save failed:", err);
      alert("Database error: Could not save item.");
    }
  };

  const handleUpdateItem = async (updatedItem: CollectionItem) => {
    try {
      await storage.saveItem(updatedItem);
      setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
      setToastMessage("Vault data updated! ✨");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Permanently delete this item? This action cannot be undone.")) {
      try {
        await storage.deleteItem(id);
        setItems(items.filter(i => i.id !== id));
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleClearVault = async (vault: VaultType) => {
    if (confirm(`Are you absolutely sure you want to clear the entire ${vault} vault?`)) {
      if (confirm(`Last warning: This will delete ALL ${items.filter(i => i.category === vault).length} items in your ${vault} collection.`)) {
        try {
          await storage.clearVaultStore(vault);
          setItems(items.filter(i => i.category !== vault));
        } catch (err) {
          console.error("Clear failed:", err);
        }
      }
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Vault AI',
      text: 'Check out my collectible vaults powered by AI!',
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setToastMessage("Link copied! 🚀");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const filteredItems = items
    .filter(i => i.category === activeVault)
    .filter(i => 
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.subTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const themeAccent = activeVault === 'comics' ? 'text-indigo-600' : 
                      activeVault === 'sports' ? 'text-emerald-600' : 
                      activeVault === 'coins' ? 'text-yellow-600' :
                      'text-amber-500';

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-gray-50 relative pb-10">
      <header className="px-6 pt-10 pb-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl comic-font tracking-tighter italic ${themeAccent}`}>VAULT AI</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 bg-gray-100 text-gray-600 rounded-full active:bg-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-5.368 3 3 0 000 5.368zm0 10.736a3 3 0 100-5.368 3 3 0 000 5.368z" />
              </svg>
            </button>
            <div className="bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase">
              {filteredItems.length} ITEMS
            </div>
          </div>
        </div>

        <VaultSwitcher activeVault={activeVault} onChange={(v) => { setActiveVault(v); setSearchTerm(''); }} />

        {view === 'collection' && (
          <div className="relative mt-2">
            <input
              type="text" placeholder={`Search ${activeVault}...`}
              className="w-full pl-4 pr-4 py-3 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-gray-200 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </header>

      <main className="px-6 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Unlocking Vault...</p>
          </div>
        ) : (
          <>
            {view === 'collection' && (
              <div className="space-y-4 pb-24">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <ItemCard 
                      key={item.id} 
                      item={item} 
                      onDelete={handleDeleteItem} 
                      onUpdate={handleUpdateItem}
                    />
                  ))
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    <p className="font-bold">This Vault is Empty</p>
                    <button onClick={() => setView('add')} className={`mt-4 ${themeAccent} font-bold`}>Add Your First Item +</button>
                  </div>
                )}
              </div>
            )}

            {view === 'add' && <ItemForm onSave={handleAddItem} activeVault={activeVault} />}
            {view === 'reports' && (
              <Reports 
                items={items} 
                activeVault={activeVault} 
                onDelete={handleDeleteItem} 
                onClearVault={handleClearVault}
              />
            )}
            {view === 'help' && <Instructions />}
          </>
        )}
      </main>

      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-medium shadow-xl z-[60] animate-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}

      <Navbar currentView={view} setView={setView} />
    </div>
  );
};

export default App;
