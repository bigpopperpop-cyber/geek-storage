
import React from 'react';
import { AppView, VaultType, VAULT_CONFIG } from '../types';

interface HeaderProps {
  view: AppView;
  activeVault: VaultType;
  totalValue: number;
  onBack: () => void;
}

const VaultHeader: React.FC<HeaderProps> = ({ view, activeVault, totalValue, onBack }) => {
  const config = VAULT_CONFIG[activeVault];

  return (
    <header className="bg-white px-6 pt-10 pb-6 border-b border-slate-100 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            VAULT <span className="opacity-20">/</span> {config.label.toUpperCase()}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Total Asset Value: <span className="text-slate-900">${totalValue.toLocaleString()}</span>
          </p>
        </div>
        
        {view !== 'vault' && (
          <button 
            onClick={onBack}
            className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};

export default VaultHeader;
