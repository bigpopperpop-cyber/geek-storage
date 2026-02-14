
import React from 'react';
import { VaultItem, VAULT_CONFIG } from '../types';

export default function Reports({ items }: { items: VaultItem[] }) {
  const categories = Object.keys(VAULT_CONFIG) as (keyof typeof VAULT_CONFIG)[];
  
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
        <h2 className="text-3xl font-black italic">COLLECTION DATA</h2>
        <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Total Portfolio Assets</p>
        <p className="text-4xl font-black mt-4">${items.reduce((a, b) => a + b.estimatedValue, 0).toLocaleString()}</p>
      </div>

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
