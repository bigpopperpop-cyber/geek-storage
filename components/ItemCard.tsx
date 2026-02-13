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

  const accentBorder = isComic ? 'border-indigo-200' : 
                       isSports ? 'border-emerald-200' : 
                       isCoin ? 'border-yellow-200' :
                       'border-amber-200';

  const displayValue = typeof item.estimatedValue === 'number' 
    ? item.estimatedValue.toLocaleString() 
    : '0';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex transition-transform active:scale-[0.98] animate-in fade-in zoom-in-95 duration-200">
      <div className="w-24 bg-gray-100 shrink-0 relative">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {item.keyFeatures && (
          <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 font-black text-[8px] px-1.5 py-0.5 uppercase tracking-widest shadow-sm rounded-br-lg">
            KEY
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
              ${displayValue}
            </span>
          </div>
          
          {item.keyFeatures && (
            <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${accentBorder} ${themeColor} text-[9px] font-black uppercase tracking-tighter shadow-sm`}>
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {item.keyFeatures}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">{item.provider} • {item.year}</p>
          <p className="text-[10px] text-gray-400 mt-1 italic line-clamp-1">{item.condition}</p>
        </div>
        <div className="flex justify-between items-end mt-2">
          <p className="text-[10px] text-gray-400 font-medium">Added {new Date(item.dateAdded).toLocaleDateString()}</p>
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