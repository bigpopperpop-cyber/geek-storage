
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

  const themeColor = isComic ? 'text-indigo-600 bg-indigo-50' : 
                     isSports ? 'text-emerald-600 bg-emerald-50' : 
                     isCoin ? 'text-yellow-700 bg-yellow-50' :
                     'text-amber-600 bg-amber-50';

  const pinColor = isComic ? 'text-indigo-500' : 
                   isSports ? 'text-emerald-500' : 
                   isCoin ? 'text-yellow-500' :
                   'text-amber-500';

  const accentBorder = isComic ? 'border-indigo-200' : 
                       isSports ? 'border-emerald-200' : 
                       isCoin ? 'border-yellow-200' :
                       'border-amber-200';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex transition-transform active:scale-[0.98] animate-in fade-in zoom-in-95 duration-200">
      {/* Fix: Display the item image if available, otherwise show the pin icon */}
      <div className={`w-16 ${themeColor} shrink-0 flex items-center justify-center border-r border-gray-50 overflow-hidden`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`transform rotate-12 ${pinColor}`}>
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-gray-900 leading-tight pr-2 line-clamp-2">
              {item.title} <span className="text-gray-400 font-normal">#{item.subTitle}</span>
            </h3>
            <span className={`text-[11px] font-black whitespace-nowrap ${themeColor} px-2 py-1 rounded-lg ml-1`}>
              ${(item.estimatedValue || 0).toLocaleString()}
            </span>
          </div>
          
          {item.keyFeatures && (
            <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${accentBorder} ${themeColor} text-[9px] font-black uppercase tracking-tighter shadow-sm`}>
              {item.keyFeatures}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">{item.provider} • {item.year}</p>
        </div>
        <div className="flex justify-between items-end mt-2">
          <p className="text-[10px] text-gray-400 font-medium">{new Date(item.dateAdded).toLocaleDateString()}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="text-gray-300 hover:text-red-500 p-2 -mr-2 -mb-2 transition-colors active:scale-125"
            aria-label="Delete item"
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