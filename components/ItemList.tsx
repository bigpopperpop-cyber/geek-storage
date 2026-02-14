
import React from 'react';
import { VaultItem } from '../types';

interface ListProps {
  items: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
}

const ItemList: React.FC<ListProps> = ({ items, onSelectItem }) => {
  if (items.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-slate-300 gap-4">
        <div className="text-6xl grayscale opacity-20">🗄️</div>
        <p className="font-bold uppercase tracking-widest text-xs">No Items in Vault</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => (
        <div 
          key={item.id}
          onClick={() => onSelectItem(item)}
          className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 active:scale-95 transition-transform group"
        >
          <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
            {item.image ? (
              <img src={item.image} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-4xl opacity-10">🖼️</div>
            )}
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black shadow-sm">
              ${item.estimatedValue?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-bold text-slate-900 text-sm truncate">{item.title}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{item.subTitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItemList;
