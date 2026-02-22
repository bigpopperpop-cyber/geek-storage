
import React, { useState } from 'react';
import { VaultType, VaultItem } from '../types';
import { searchAndAppraiseByText } from '../services/geminiService';
import { Search, Sparkles, ArrowLeft } from 'lucide-react';

interface TextSearchAddProps {
  category: VaultType;
  onCancel: () => void;
  onResult: (item: VaultItem) => void;
}

const TextSearchAdd: React.FC<TextSearchAddProps> = ({ category, onCancel, onResult }) => {
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

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
      alert(msg);
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

      <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100">
        <p className="text-xs text-indigo-700 font-bold leading-relaxed">
          Describe your item in detail (e.g., "1996 Topps Kobe Bryant Rookie Card #138") and Gemini will find the market value and specs for you.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-6">
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

      <div className="text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
          Uses Gemini 3.1 Pro with Google Search
        </p>
      </div>
    </div>
  );
};

export default TextSearchAdd;
