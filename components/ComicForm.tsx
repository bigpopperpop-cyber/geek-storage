
import React, { useState, useRef } from 'react';
import { CollectionItem, ComicCondition, VaultType } from '../types';
import { identifySportsCard } from '../services/geminiService';

interface ItemFormProps {
  onSave: (item: CollectionItem) => void;
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
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        
        setIdentifying(true);
        setStatusMsg("Scanning Card...");
        try {
          const details = await identifySportsCard(rawBase64);
          
          if (details) {
            setFormData(prev => ({
              ...prev,
              title: details.title || '',
              subTitle: details.subTitle || '',
              provider: details.provider || '',
              year: details.year || '',
              keyFeatures: details.keyFeatures || '',
            }));
            setStatusMsg("Card Identified!");
            setTimeout(() => setStatusMsg(null), 2000);
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

    const newItem: CollectionItem = {
      id: generateId(),
      category: activeVault,
      ...formData,
      estimatedValue: parseFloat(formData.estimatedValue) || 0,
      aiJustification: "Manual entry",
      dateAdded: new Date().toISOString(),
      notes: ''
    };

    onSave(newItem);
  };

  const conditions: ComicCondition[] = [
    'Gem Mint', 'Mint', 'Near Mint', 'Very Fine', 'Fine', 'Very Good', 'Good', 'Fair', 'Poor'
  ];

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
            className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl border-2 border-dashed border-emerald-200 font-bold uppercase text-xs tracking-widest flex flex-col items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            {identifying ? "Identifying..." : "Scan Card for Details"}
          </button>
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          {statusMsg && <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase">{statusMsg}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Title / Player</label>
            <input
              type="text" required
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Ken Griffey Jr."
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
