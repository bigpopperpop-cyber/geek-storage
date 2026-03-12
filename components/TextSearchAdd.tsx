
import React, { useState, useRef } from 'react';
import { VaultType, VaultItem } from '../types';
import { searchAndAppraiseByText } from '../services/geminiService';
import { Search, Sparkles, ArrowLeft, Camera, X } from 'lucide-react';
import { useUI } from '../context/UIContext';

interface TextSearchAddProps {
  category: VaultType;
  onCancel: () => void;
  onResult: (item: VaultItem) => void;
}

const TextSearchAdd: React.FC<TextSearchAddProps> = ({ category, onCancel, onResult }) => {
  const { showMessage } = useUI();
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
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
      reader.onloadend = () => {
        setImage(reader.result as string);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Data Bridge: Check if input is a JSON block
    if (query.trim().startsWith('{') && query.trim().endsWith('}')) {
      try {
        const data = JSON.parse(query.trim());
        if (data.name) {
          // Clean up value (remove $ and commas)
          const rawValue = typeof data.value === 'string' 
            ? parseFloat(data.value.replace(/[$,]/g, '')) 
            : (typeof data.value === 'number' ? data.value : 0);

          const newItem: VaultItem = {
            id: Date.now().toString(36),
            category,
            title: data.name,
            subTitle: data.year || '',
            year: data.year || '',
            brand: '',
            cardNumber: '',
            significance: 'Imported via Data Bridge',
            condition: data.condition || 'Raw',
            estimatedValue: isNaN(rawValue) ? 0 : rawValue,
            facts: ['Imported from external research'],
            dateAdded: new Date().toISOString(),
            lastValued: new Date().toISOString(),
            image: image || undefined
          };

          showMessage({
            title: "Data Bridge Active",
            message: `Got it, Master Coder! ${data.name} has been added to the vault.`,
            type: 'success'
          });
          onResult(newItem);
          return;
        }
      } catch (e) {
        // Not valid JSON or missing name, fall back to AI search
        console.log("Not a valid Data Bridge block, falling back to AI search");
      }
    }

    setProcessing(true);
    setStatus('AI Researching...');

    try {
      const data = await searchAndAppraiseByText(query, category);
      if (data) {
        onResult({
          id: Date.now().toString(36),
          category,
          ...data,
          dateAdded: new Date().toISOString(),
          lastValued: new Date().toISOString(),
          image: image || undefined
        });
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Search failed.";
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        msg = "AI is currently busy (Rate Limit hit). Please wait 30 seconds and try again.";
      } else {
        msg = err.message || "Unknown error.";
      }
      showMessage({
        title: "Search Failed",
        message: msg,
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col gap-8 py-12 animate-in slide-in-from-bottom-10 duration-500">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h2 className="text-2xl font-black text-slate-900">AI Text Search</h2>
      </div>

      <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 space-y-3">
        <p className="text-xs text-indigo-700 font-bold leading-relaxed">
          Describe your item in detail (e.g., "1996 Topps Kobe Bryant Rookie Card #138") and Gemini will find the market value and specs for you.
        </p>
        <div className="pt-2 border-t border-indigo-100">
          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-1">⚡ Data Bridge Mode</p>
          <p className="text-[10px] text-indigo-600/70 font-medium">
            Paste a JSON block from your external research to instantly import data.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-6">
        {/* Image Upload Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Photo (Optional)</label>
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

        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter item details..."
            className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 pt-12 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[160px] resize-none"
            disabled={processing}
          />
          <Search className="absolute left-6 top-6 w-5 h-5 text-slate-400" />
        </div>

        <button
          type="submit"
          disabled={processing || !query.trim()}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {processing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{status}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Research & Add to Vault</span>
            </>
          )}
        </button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
          Uses Gemini Flash with Google Search
        </p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Hitting limits? <button onClick={() => window.dispatchEvent(new CustomEvent('switch-to-manual'))} className="text-indigo-600 underline">Add Manually</button>
        </p>
      </div>
    </div>
  );
};

export default TextSearchAdd;
