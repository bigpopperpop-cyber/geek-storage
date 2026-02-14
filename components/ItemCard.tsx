
import React, { useState } from 'react';
import { VaultItem } from '../types';
import { reEvaluateItem } from '../services/geminiService';

interface ItemCardProps {
  item: VaultItem;
  onDelete: (id: string) => void;
  onUpdate: (item: VaultItem) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const isComic = item.category === 'comics';
  const isSports = item.category === 'sports';
  const isCoin = item.category === 'coins';

  const theme = isComic ? { bg: 'bg-indigo-50', text: 'text-indigo-600', pin: 'text-indigo-500', border: 'border-indigo-100', accent: 'bg-indigo-600' } :
                isSports ? { bg: 'bg-emerald-50', text: 'text-emerald-600', pin: 'text-emerald-500', border: 'border-emerald-100', accent: 'bg-emerald-600' } :
                isCoin ? { bg: 'bg-yellow-50', text: 'text-yellow-700', pin: 'text-yellow-500', border: 'border-yellow-100', accent: 'bg-yellow-700' } :
                { bg: 'bg-amber-50', text: 'text-amber-600', pin: 'text-amber-500', border: 'border-amber-100', accent: 'bg-amber-600' };

  const handleReEvaluate = async () => {
    setIsUpdating(true);
    try {
      const result = await reEvaluateItem(item);
      if (result) {
        // Fixed: Updated result properties to match reEvaluateItem service response
        onUpdate({
          ...item,
          estimatedValue: result.estimatedValue || item.estimatedValue,
          facts: result.updatedFacts || item.facts,
          aiJustification: result.reasoning || item.aiJustification,
          sources: result.sources || item.sources,
          lastValued: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 ${isUpdating ? 'opacity-70 scale-[0.99] grayscale-[0.5]' : ''}`}>
      <div className="flex h-full">
        {/* Category Pin Icon */}
        <div className={`w-16 ${theme.bg} shrink-0 flex items-center justify-center border-r border-gray-50 relative`}>
          {isUpdating && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40">
              <div className={`w-6 h-6 border-2 border-t-transparent ${theme.text} rounded-full animate-spin`}></div>
            </div>
          )}
          <div className={`transform rotate-12 ${theme.pin}`}>
            <svg className="w-8 h-8 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z" />
            </svg>
          </div>
        </div>
        
        <div className="p-4 flex-grow flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gray-900 leading-tight pr-2 truncate">
                {item.title} <span className="text-gray-400 font-normal">{item.subTitle}</span>
              </h3>
              <div className="flex flex-col items-end">
                <span className={`text-[11px] font-black whitespace-nowrap ${theme.text} ${theme.bg} px-2 py-1 rounded-lg`}>
                  ${(item.estimatedValue || 0).toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {item.keyFeatures && (
                <span className={`px-2 py-0.5 rounded-full border ${theme.border} ${theme.text} text-[9px] font-black uppercase tracking-tighter`}>
                  {item.keyFeatures}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 text-[9px] font-bold uppercase tracking-tighter">
                {item.condition}
              </span>
            </div>

            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-bold">
              {item.brand} • {item.year}
            </p>

            {item.facts && item.facts.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Vault Insights</p>
                {item.facts.map((fact, i) => (
                  <p key={i} className="text-[10px] text-gray-600 leading-tight flex gap-1.5">
                    <span className={theme.text}>•</span> {fact}
                  </p>
                ))}
              </div>
            )}

            {/* Display Grounding Sources */}
            {item.sources && item.sources.length > 0 && (
              <div className="mt-3 px-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Verified Sources</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {item.sources.map((source, i) => (
                    <a 
                      key={i} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`${theme.text} text-[9px] font-bold hover:underline truncate max-w-[140px] block`}
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
            <div className="flex gap-2">
              <button 
                onClick={handleReEvaluate}
                disabled={isUpdating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${isUpdating ? 'bg-gray-100 text-gray-400' : `${theme.bg} ${theme.text} hover:opacity-80`}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {isUpdating ? 'Thinking...' : 'AI Re-evaluate'}
              </button>
            </div>
            <div className="flex items-center gap-3">
               <p className="text-[9px] text-gray-300 font-medium uppercase tracking-widest">{new Date(item.dateAdded).toLocaleDateString()}</p>
               <button 
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                aria-label="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
