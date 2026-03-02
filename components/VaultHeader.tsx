
import React from 'react';
import { AppView, VaultType, VAULT_CONFIG } from '../types';

interface HeaderProps {
  view: AppView;
  activeVault: VaultType;
  totalValue: number;
  itemCount: number;
  onBack: () => void;
}

const VaultHeader: React.FC<HeaderProps> = ({ view, activeVault, totalValue, itemCount, onBack }) => {
  const config = VAULT_CONFIG[activeVault];

  const handleFixKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // The platform will inject the new key into process.env.API_KEY
      // We might need to refresh or just let the next call use it
      alert("API Key selection opened. After selecting a key, please try your action again.");
    } else {
      alert("API Key selection is only available in the AI Studio environment.");
    }
  };

  return (
    <header className="bg-white px-6 pt-10 pb-6 border-b border-slate-100 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            VAULT <span className="opacity-20">/</span> {config.label.toUpperCase()}
          </h1>
          <div className="flex flex-col gap-0.5 mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Asset Value: <span className="text-slate-900">${totalValue.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Items in View: <span className="text-slate-900">{itemCount}</span>
              </p>
              <button 
                onClick={handleFixKey}
                className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
              >
                Fix API Key
              </button>
            </div>
          </div>
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
