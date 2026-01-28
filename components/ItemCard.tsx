
import React from 'react';
import { CollectionItem } from '../types';

interface ItemCardProps {
  item: CollectionItem;
  onDelete: (id: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete }) => {
  const themeColor = item.category === 'comics' ? 'text-indigo-600 bg-indigo-50' : 
                     item.category === 'sports' ? 'text-emerald-600 bg-emerald-50' : 
                     item.category === 'coins' ? 'text-yellow-700 bg-yellow-50' :
                     'text-amber-600 bg-amber-50';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex transition-transform active:scale-[0.98]">
      <div className="w-24 bg-gray-200 shrink-0">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-gray-900 leading-tight pr-2 line-clamp-2">{item.title} <span className="text-gray-400 font-normal">{item.subTitle}</span></h3>
            <span className={`text-xs font-bold whitespace-nowrap ${themeColor} px-2 py-1 rounded ml-1`}>
              ${item.estimatedValue.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">{item.provider} • {item.year}</p>
          <p className="text-[10px] text-gray-400 mt-1 italic line-clamp-1">{item.condition}</p>
        </div>
        <div className="flex justify-between items-end mt-2">
          <p className="text-[10px] text-gray-400">{new Date(item.dateAdded).toLocaleDateString()}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="text-red-400 hover:text-red-600 p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
