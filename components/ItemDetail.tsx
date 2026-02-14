
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
          lastValued: new Date().toISOString(),
          sources: result.sources || item.sources,
          aiJustification: result.reasoning || item.aiJustification
        });
      }
    } catch (err) {
      alert("Failed to re-value. Try again later.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-300">
      <div className="relative aspect-[4/3] bg-slate-900">
        <img src={item.image} className="w-full h-full object-cover opacity-90" alt={item.title} />
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 bg-black/40 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/60 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest inline-block mb-2">
              {item.year} {item.provider}
            </span>
            <h2 className="text-2xl font-black text-slate-900 leading-tight truncate">{item.title}</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-tight">{item.subTitle}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Est. Value</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">
              ${(item.estimatedValue || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {item.significance && (
          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              ✨ Collector Significance
            </p>
            <p className="text-sm font-semibold text-slate-700 italic leading-relaxed">"{item.significance}"</p>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-1">Vault Insights</h3>
          <ul className="space-y-3">
            {item.facts.map((fact, i) => (
              <li key={i} className="flex gap-3 text-sm font-medium text-slate-600 leading-snug">
                <span className="w-5 h-5 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold">
                  {i + 1}
                </span>
                {fact}
              </li>
            ))}
          </ul>
        </div>

        {/* Grounding Sources - Mandatory as per Google Search Policy */}
        {item.sources && item.sources.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-1">Verified Research Sources</h3>
            <div className="flex flex-wrap gap-2">
              {item.sources.map((source, i) => (
                <a 
                  key={i} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {source.title.length > 20 ? source.title.substring(0, 20) + '...' : source.title}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col gap-3">
          <button
            onClick={handleReValue}
            disabled={isUpdating}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {isUpdating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {isUpdating ? 'Analyzing Market...' : 'Refresh Market Value'}
          </button>
          
          <button
            onClick={onDelete}
            className="w-full py-4 text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-colors"
          >
            Delete Item
          </button>
          
          <div className="text-center mt-2">
             <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">
              Last Analysis: {new Date(item.lastValued).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
