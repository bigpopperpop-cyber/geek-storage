
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
  ];

  return (
    <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
      {vaults.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeVault === v.id 
              ? `${v.color} text-white shadow-sm scale-105` 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>{v.icon}</span>
          <span>{v.label}</span>
        </button>
      ))}
    </div>
  );
};

export default VaultSwitcher;
