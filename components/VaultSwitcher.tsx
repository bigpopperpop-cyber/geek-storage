
import React from 'react';
import { VaultType, VAULT_CONFIG } from '../types';

interface SwitcherProps {
  activeVault: VaultType;
  setActiveVault: (v: VaultType) => void;
}

const VaultSwitcher: React.FC<SwitcherProps> = ({ activeVault, setActiveVault }) => {
  const vaults = Object.keys(VAULT_CONFIG) as VaultType[];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6 mb-2">
      {vaults.map((v) => {
        const active = activeVault === v;
        const config = VAULT_CONFIG[v];
        return (
          <button
            key={v}
            onClick={() => setActiveVault(v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap font-bold text-sm transition-all shadow-sm ${
              active 
                ? 'bg-slate-900 text-white scale-105' 
                : 'bg-white text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default VaultSwitcher;
