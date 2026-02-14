
import React from 'react';
import { CollectionItem } from '../types';

interface ItemCardProps {
  item: CollectionItem;
  onDelete: (id: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete }) => {
  const isComic = item.category === 'comics';
  const isSports = item.category === 'sports';
  const isCoin = item.category === 'coins';
  const isFantasy = item.category === 'fantasy';

  // Dynamic Theme Generation
  const theme = isComic ? { bg: 'bg-indigo-50', text: 'text-indigo-600', pin: 'text-indigo-500', border: 'border-indigo-100' } :
                isSports ? { bg: 'bg-emerald-50', text: 'text-emerald-600', pin: 'text-emerald-500', border: 'border-emerald-100' } :
                isCoin ? { bg: 'bg-yellow-50', text: 'text-yellow-700', pin: 'text-yellow-500', border: 'border-yellow-100' } :
                { bg: 'bg-amber-50', text: 'text-amber-600', pin: 'text-amber-500', border: 'border-amber-100' };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex transition-transform active:scale-[0.98] animate-in fade-in slide-in-from-right-2 duration-300`}>
      {/* Category Pin Icon (Thumbtack) */}
      <div className={`w-16 ${theme.bg} shrink-0 flex items-center justify-center border-r border-gray-50`}>
        <div className={`transform rotate-12 transition-transform hover:rotate-0 ${theme.pin}`}>
          <svg className="w-8 h-8 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z" />
          </svg>
        </div>
      </div>
      
      <div className="p-4 flex-grow flex flex-col justify-between min-w-0">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-gray-900 leading-tight pr-2 truncate">
              {item.title} <span className="text-gray-400 font-normal">#{item.subTitle}</span>
            </h3>
            <span className={`text-[11px] font-black whitespace-nowrap ${theme.text} ${theme.bg} px-2 py-1 rounded-lg ml-2`}>
              ${(item.estimatedValue || 0).toLocaleString()}
            </span>
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
            {item.provider} • {item.year}
          </p>
        </div>

        <div className="flex justify-between items-end mt-3">
          <p className="text-[9px] text-gray-300 font-medium uppercase tracking-widest">{new Date(item.dateAdded).toLocaleDateString()}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="text-gray-300 hover:text-red-500 p-1 transition-colors"
            aria-label="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
