
import React, { useState } from 'react';
import { VaultType, VaultItem } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

interface ManualAddProps {
  category: VaultType;
  onCancel: () => void;
  onResult: (item: VaultItem) => void;
}

const ManualAdd: React.FC<ManualAddProps> = ({ category, onCancel, onResult }) => {
  const [formData, setFormData] = useState({
    title: '',
    year: '',
    brand: '',
    cardNumber: '',
    condition: '',
    rarity: 'Common',
    estimatedValue: '',
    significance: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.estimatedValue) return;

    onResult({
      id: Date.now().toString(36),
      category,
      title: formData.title,
      subTitle: formData.cardNumber ? `#${formData.cardNumber}` : '',
      year: formData.year,
      brand: formData.brand,
      cardNumber: formData.cardNumber,
      condition: formData.condition || 'Raw',
      rarity: formData.rarity,
      estimatedValue: parseFloat(formData.estimatedValue),
      significance: formData.significance,
      facts: formData.notes ? [formData.notes] : ['Manually added item'],
      dateAdded: new Date().toISOString(),
      lastValued: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col gap-6 py-10 animate-in slide-in-from-bottom-10 duration-500">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h2 className="text-2xl font-black text-slate-900">Manual Entry</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name *</label>
          <input
            required
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. 1996 Topps Kobe Bryant"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year</label>
            <input
              type="text"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              placeholder="1996"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Topps"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Value ($) *</label>
            <input
              required
              type="number"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition</label>
            <input
              type="text"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              placeholder="Mint 9"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Significance</label>
          <input
            type="text"
            value={formData.significance}
            onChange={(e) => setFormData({ ...formData, significance: e.target.value })}
            placeholder="e.g. Rookie Card, Short Print"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800 flex items-center justify-center gap-3 mt-4"
        >
          <Save className="w-5 h-5" />
          Save to Vault
        </button>
      </form>
    </div>
  );
};

export default ManualAdd;
