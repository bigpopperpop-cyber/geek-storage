
import React from 'react';
import { VaultItem } from '../types';

interface ListProps {
  items: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
  onToggleTreasure?: (item: VaultItem) => void;
  isTreasureView?: boolean;
}

const ItemList: React.FC<ListProps> = ({ items, onSelectItem, onToggleTreasure, isTreasureView }) => {
  if (items.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-slate-300 gap-4">
        <div className="text-6xl grayscale opacity-20">
          {isTreasureView ? '💎' : '🗄️'}
        </div>
        <p className="font-bold uppercase tracking-widest text-xs">
          {isTreasureView ? 'Your Treasure Box is empty' : 'No Items in Vault'}
        </p>
        {isTreasureView && (
          <p className="text-[10px] text-slate-400 font-medium max-w-[200px] text-center">
            Add items to your Treasure Box by clicking the star icon on any item.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => {
        try {
          if (!item) return null;
          return (
            <div 
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 active:scale-95 transition-transform group relative"
            >
              <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                {item.image ? (
                  <img src={item.image} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl opacity-10">🖼️</div>
                )}
                
                {/* Treasure Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTreasure?.(item);
                  }}
                  className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-md transition-all active:scale-75 shadow-sm ${
                    item.isTreasure 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-white/80 text-slate-300 hover:text-amber-500'
                  }`}
                >
                  <svg className="w-3 h-3" fill={item.isTreasure ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </button>

                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black shadow-sm">
                  ${item.estimatedValue?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-slate-900 text-sm truncate">{item.title || 'Untitled Item'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{item.subTitle || 'No Details'}</p>
              </div>
            </div>
          );
        } catch (e) {
          console.error("Error rendering item:", item, e);
          return null;
        }
      })}
    </div>
  );
};

export default ItemList;
