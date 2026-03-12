
import React, { useState, useRef } from 'react';
import { VaultType, VaultItem, COLLECTIBLE_CONDITIONS, COMIC_CONDITIONS } from '../types';
import { ArrowLeft, Save, Camera, X } from 'lucide-react';
import { useUI } from '../context/UIContext';

interface ManualAddProps {
  category: VaultType;
  onCancel: () => void;
  onResult: (item: VaultItem) => void;
}

const resizeImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

const ManualAdd: React.FC<ManualAddProps> = ({ category, onCancel, onResult }) => {
  const { showMessage } = useUI();
  const [saving, setSaving] = useState(false);
  const conditions = category === 'comics' ? COMIC_CONDITIONS : COLLECTIBLE_CONDITIONS;
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
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showMessage({
          title: "File Too Large",
          message: "Please select an image smaller than 10MB.",
          type: 'error'
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resized = await resizeImage(reader.result as string);
        setImage(resized);
      };
      reader.onerror = () => {
        showMessage({
          title: "Error",
          message: "Could not read the selected image.",
          type: 'error'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.estimatedValue || saving) return;

    const value = parseFloat(formData.estimatedValue);
    if (isNaN(value)) {
      showMessage({
        title: "Invalid Value",
        message: "Please enter a valid number for the estimated value.",
        type: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      await onResult({
        id: Date.now().toString(36),
        category,
        title: formData.title,
        subTitle: formData.cardNumber ? `#${formData.cardNumber}` : '',
        year: formData.year,
        brand: formData.brand,
        cardNumber: formData.cardNumber,
        condition: formData.condition || 'Raw',
        rarity: formData.rarity,
        estimatedValue: value,
        significance: formData.significance,
        facts: formData.notes ? [formData.notes] : ['Manually added item'],
        dateAdded: new Date().toISOString(),
        lastValued: new Date().toISOString(),
        image: image || undefined
      });
    } catch (err) {
      // Error is handled in App.tsx handleResult
      setSaving(false);
    }
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
        {/* Image Upload Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Photo</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden group"
          >
            {image ? (
              <>
                <img src={image} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImage(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Camera className="w-8 h-8" />
                <span className="text-xs font-bold">Tap to add photo</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            className="hidden" 
            capture="environment"
          />
        </div>

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
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none appearance-none"
            >
              <option value="">Select Condition</option>
              {conditions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
          disabled={saving}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800 flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Saving...' : 'Save to Vault'}
        </button>
      </form>
    </div>
  );
};

export default ManualAdd;
