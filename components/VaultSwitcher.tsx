
import React from 'react';
import { VaultType } from '../types';

interface VaultSwitcherProps {
  activeVault: VaultType;
  onChange: (vault: VaultType) => void;
}

const VaultSwitcher: React.FC<VaultSwitcherProps> = ({ activeVault, onChange }) => {
  const vaults: { id: VaultType; label: string; icon: string; color: string }[] = [
    { id: 'comics', label: 'Comics', icon: '📚', color: 'bg-indigo-600' },
    { id: 'sports', label: 'Sports', icon: '⚾', color: 'bg-emerald-600' },
    { id: 'fantasy', label: 'Fantasy', icon: '🧙‍♂️', color: 'bg-amber-500' },
    { id: 'coins', label: 'Coins', icon: '🪙', color: 'bg-yellow-600' },
  ];

  return (
    <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-2xl mb-6">
      {vaults.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
            activeVault === v.id 
              ? `${v.color} text-white shadow-sm scale-105` 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="text-sm">{v.icon}</span>
          <span className="truncate w-full text-center">{v.label}</span>
        </button>
      ))}
    </div>
  );
};

export default VaultSwitcher;
