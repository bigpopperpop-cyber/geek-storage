
import React, { useState, useRef } from 'react';
import { VaultItem, ComicCondition, VaultType } from '../types';
import { identifyCollectible } from '../services/geminiService';

interface ItemFormProps {
  onSave: (item: VaultItem) => void;
  activeVault: VaultType;
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const ItemForm: React.FC<ItemFormProps> = ({ onSave, activeVault }) => {
  const [identifying, setIdentifying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subTitle: '',
    provider: '',
    year: '',
    keyFeatures: '',
    condition: 'Near Mint' as ComicCondition,
    estimatedValue: '',
    facts: [] as string[],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        
        setIdentifying(true);
        setStatusMsg("Analyzing significance...");
        try {
          // Corrected: Imported identifyCollectible as identifyItem was not exported
          const details = await identifyCollectible(rawBase64, activeVault);
          
          if (details) {
            setFormData(prev => ({
              ...prev,
              title: details.title || '',
              subTitle: details.subTitle || '',
              provider: details.provider || '',
              year: details.year || '',
              keyFeatures: details.keyFeatures || details.significance || '',
              estimatedValue: details.estimatedValue?.toString() || '',
              facts: details.facts || [],
            }));
            setStatusMsg("Details & significance identified!");
            setTimeout(() => setStatusMsg(null), 3000);
          } else {
            setStatusMsg("Could not identify. Please enter manually.");
          }
        } catch (err) {
          setStatusMsg("Scan failed.");
        } finally {
          setIdentifying(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    // Fixed: Mapped form data to VaultItem interface correctly
    const newItem: VaultItem = {
      id: generateId(),
      category: activeVault,
      title: formData.title,
      subTitle: formData.subTitle,
      year: formData.year,
      provider: formData.provider,
      significance: formData.keyFeatures,
      condition: formData.condition,
      estimatedValue: parseFloat(formData.estimatedValue) || 0,
      facts: formData.facts,
      aiJustification: "Identified via AI Research",
      dateAdded: new Date().toISOString(),
      lastValued: new Date().toISOString(),
      notes: '',
      keyFeatures: formData.keyFeatures
    };

    onSave(newItem);
  };

  const conditions: ComicCondition[] = [
    'Gem Mint', 'Mint', 'Near Mint', 'Very Fine', 'Fine', 'Very Good', 'Good', 'Fair', 'Poor'
  ];

  const vaultColor = activeVault === 'comics' ? 'emerald' : 
                    activeVault === 'sports' ? 'emerald' : 
                    activeVault === 'coins' ? 'yellow' : 'amber';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          New {activeVault.charAt(0).toUpperCase() + activeVault.slice(1)} Item
        </h2>

        <div className="mb-6 text-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-6 bg-${vaultColor}-50 text-${vaultColor}-600 rounded-2xl border-2 border-dashed border-${vaultColor}-200 font-bold uppercase text-xs tracking-widest flex flex-col items-center gap-2 transition-all active:scale-95`}
          >
            <div className={`p-3 bg-${vaultColor}-100 rounded-full mb-1`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            {identifying ? "Researching Item..." : "Deep Scan Item"}
            <span className="text-[9px] opacity-60 normal-case font-medium">Detects Rookie status, 1st appearances & rarity</span>
          </button>
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          {statusMsg && <p className={`text-[10px] font-bold text-${vaultColor}-600 mt-2 uppercase animate-pulse`}>{statusMsg}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Title / Player / Key</label>
            <input
              type="text" required
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm font-bold"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Ken Griffey Jr. / Hulk #181"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Significance / Key Features</label>
            <input
              type="text"
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none text-sm italic ${formData.keyFeatures ? 'text-emerald-600' : ''}`}
              value={formData.keyFeatures}
              onChange={(e) => setFormData({...formData, keyFeatures: e.target.value})}
              placeholder="e.g. Rookie Card / 1st Appearance of Wolverine"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Set & Number</label>
            <input
              type="text" required
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm"
              value={formData.subTitle}
              onChange={(e) => setFormData({...formData, subTitle: e.target.value})}
              placeholder="e.g. 1989 Upper Deck #1"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Value ($)</label>
            <input
              type="number"
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({...formData, estimatedValue: e.target.value})}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Year</label>
            <input
              type="text"
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm"
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
              placeholder="YYYY"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Discovered Facts</label>
            <div className="bg-gray-50 rounded-2xl p-4 min-h-[60px] space-y-2">
              {formData.facts.length > 0 ? (
                formData.facts.map((f, i) => (
                  <p key={i} className="text-[11px] text-gray-600 flex gap-2">
                    <span className="text-emerald-500">•</span> {f}
                  </p>
                ))
              ) : (
                <p className="text-[11px] text-gray-300 italic">Scan an item to see interesting history...</p>
              )}
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Condition</label>
            <select
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm appearance-none"
              value={formData.condition}
              onChange={(e) => setFormData({...formData, condition: e.target.value as ComicCondition})}
            >
              {conditions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={identifying}
          className="w-full mt-8 p-5 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg active:scale-95 disabled:bg-gray-300 transition-all"
        >
          Add to Vault
        </button>
      </div>
    </form>
  );
};

export default ItemForm;
