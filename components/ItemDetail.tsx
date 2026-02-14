
import React, { useState } from 'react';
import { VaultItem, VAULT_CONFIG } from '../types';
import { reEvaluateItem } from '../services/geminiService';

interface DetailProps {
  item: VaultItem;
  onUpdate: (item: VaultItem) => void;
  onDelete: () => void;
  onBack: () => void;
}

const ItemDetail: React.FC<DetailProps> = ({ item, onUpdate, onDelete, onBack }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const theme = VAULT_CONFIG[item.category];

  const handleReValue = async () => {
    setIsUpdating(true);
    try {
      const result = await reEvaluateItem(item);
      if (result) {
        onUpdate({
          ...item,
          estimatedValue: result.estimatedValue,
          facts: result.updatedFacts || item.facts,
          significance: result.significance || item.significance,
          lastValued: new Date().toISOString(),
          sources: result.sources || item.sources,
          aiJustification: result.reasoning || item.aiJustification
        });
      }
    } catch (err) {
      alert("Market check failed. Try again later.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-300">
      <div className="relative aspect-[4/3] bg-slate-900 group">
        {item.image ? (
          <img src={item.image} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" alt={item.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🖼️</div>
        )}
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 bg-black/50 text-white p-3 rounded-full backdrop-blur-lg hover:bg-black/70 transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="p-8">
        <div className="flex justify-between items-start gap-6">
          <div className="min-w-0 flex-grow">
            <div className="flex items-center gap-2 mb-2">
               <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                {item.year} {item.brand}
              </span>
              {item.cardNumber && (
                <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-indigo-100">
                  #{item.cardNumber}
                </span>
              )}
            </div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">{item.title}</h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter mb-1">Market Value</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">
              ${(item.estimatedValue || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {item.significance && (
          <div className="mt-8 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="text-base">💎</span> Key Attribute
            </p>
            <p className="text-base font-bold text-indigo-900 leading-relaxed italic">"{item.significance}"</p>
          </div>
        )}

        <div className="mt-10">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Vault Analysis</h3>
          <ul className="space-y-4">
            {item.facts.map((fact, i) => (
              <li key={i} className="flex gap-4 text-sm font-semibold text-slate-700 leading-snug">
                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-[11px] shrink-0 font-black">
                  {i + 1}
                </span>
                {fact}
              </li>
            ))}
          </ul>
        </div>

        {item.sources && item.sources.length > 0 && (
          <div className="mt-10">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Verified Market Sources</h3>
            <div className="flex flex-wrap gap-3">
              {item.sources.map((source, i) => (
                <a 
                  key={i} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black border border-slate-100 hover:bg-white hover:shadow-md transition-all flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {source.title.length > 24 ? source.title.substring(0, 24) + '...' : source.title}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col gap-4">
          <button
            onClick={handleReValue}
            disabled={isUpdating}
            className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              {isUpdating ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <span>{isUpdating ? 'Researching...' : 'Deep AI Market Research'}</span>
            </div>
            {!isUpdating && <span className="text-[9px] normal-case opacity-60">Finds Rookie status, 1st appearances & auction history</span>}
          </button>
          
          <button
            onClick={onDelete}
            className="w-full py-4 text-red-500 font-black text-[11px] uppercase tracking-widest hover:bg-red-50 rounded-[1.5rem] transition-colors"
          >
            Purge from Vault
          </button>
          
          <div className="text-center">
             <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">
              Last Analysis: {new Date(item.lastValued).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
