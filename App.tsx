
import React, { useState, useEffect } from 'react';
import { CollectionItem, AppView, VaultType } from './types';
import Navbar from './components/Navbar';
import ItemCard from './components/ItemCard';
import ItemForm from './components/ComicForm';
import Reports from './components/Reports';
import VaultSwitcher from './components/VaultSwitcher';

const STORAGE_KEY = 'comicvault_data_v2';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('collection');
  const [activeVault, setActiveVault] = useState<VaultType>('comics');
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const handleAddItem = (item: CollectionItem) => {
    setItems([item, ...items]);
    setView('collection');
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Remove this item from your vault?")) {
      setItems(items.filter(i => i.id !== id));
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
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const filteredItems = items
    .filter(i => i.category === activeVault)
    .filter(i => 
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.provider.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const themeAccent = activeVault === 'comics' ? 'text-indigo-600' : 
                      activeVault === 'sports' ? 'text-emerald-600' : 
                      'text-amber-500';

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-gray-50 relative pb-10">
      <header className="px-6 pt-10 pb-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl comic-font tracking-tighter italic ${themeAccent}`}>VAULT AI</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 bg-gray-100 text-gray-600 rounded-full">
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
              className="w-full pl-4 pr-4 py-3 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </header>

      <main className="px-6 py-6">
        {view === 'collection' && (
          <div className="space-y-4 pb-24">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => <ItemCard key={item.id} item={item} onDelete={handleDeleteItem} />)
            ) : (
              <div className="text-center py-20 text-gray-400">
                <p className="font-bold">This Vault is Empty</p>
                <button onClick={() => setView('add')} className="mt-4 text-indigo-600 font-bold">Add Item +</button>
              </div>
            )}
          </div>
        )}

        {view === 'add' && <ItemForm onSave={handleAddItem} activeVault={activeVault} />}
        {view === 'reports' && <Reports comics={items} activeVault={activeVault} />}
      </main>

      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-medium shadow-xl z-[60]">
          Link copied! 🚀
        </div>
      )}

      <Navbar currentView={view} setView={setView} />
    </div>
  );
};

export default App;
