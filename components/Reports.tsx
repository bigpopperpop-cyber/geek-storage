
import React, { useState, useEffect } from 'react';
import { VaultItem, VAULT_CONFIG } from '../types';
import { getCollectionInsights } from '../services/geminiService';
import { Sparkles } from 'lucide-react';

export default function Reports({ items }: { items: VaultItem[] }) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const categories = Object.keys(VAULT_CONFIG) as (keyof typeof VAULT_CONFIG)[];

  useEffect(() => {
    if (items.length > 0) {
      setLoadingInsights(true);
      getCollectionInsights(items)
        .then(setInsights)
        .finally(() => setLoadingInsights(false));
    }
  }, [items]);
  
  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black italic">COLLECTION DATA</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Total Portfolio Assets</p>
          <p className="text-4xl font-black mt-4">${items.reduce((a, b) => a + (b.estimatedValue || 0), 0).toLocaleString()}</p>
        </div>
        <div className="absolute -right-10 -bottom-10 text-white/5 text-[10rem] font-black italic select-none">DATA</div>
      </div>

      {items.length > 0 && (
        <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-200" />
            <h3 className="text-sm font-black uppercase tracking-widest">AI Collection Insights</h3>
          </div>
          {loadingInsights ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
              <p className="text-xs font-bold text-indigo-100 animate-pulse">Analyzing collection patterns...</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {insights.map((insight, i) => (
                <li key={i} className="flex gap-3 text-xs font-bold leading-relaxed text-indigo-50">
                  <span className="text-indigo-300">0{i + 1}</span>
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category === cat);
          const val = catItems.reduce((a, b) => a + b.estimatedValue, 0);
          return (
            <div key={cat} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{VAULT_CONFIG[cat].icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cat}</span>
              </div>
              <p className="text-xl font-black text-slate-900">${val.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-300 mt-1">{catItems.length} ITEMS</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
