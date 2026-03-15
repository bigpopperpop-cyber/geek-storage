
import React from 'react';
import { AppView, VaultType, VAULT_CONFIG } from '../types';
import { useUI } from '../context/UIContext';

interface HeaderProps {
  view: AppView;
  activeVault: VaultType;
  totalValue: number;
  itemCount: number;
  onBack: () => void;
  onShare?: () => void;
}

const VaultHeader: React.FC<HeaderProps> = ({ view, activeVault, totalValue, itemCount, onBack, onShare }) => {
  const { showMessage } = useUI();
  const config = VAULT_CONFIG[activeVault] || VAULT_CONFIG.other;

  const handleFixKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // The platform will inject the new key into process.env.API_KEY
      // We might need to refresh or just let the next call use it
      showMessage({
        title: "Key Selection",
        message: "API Key selection opened. After selecting a key, please try your action again.",
        type: 'info'
      });
    } else {
      showMessage({
        title: "Environment Error",
        message: "API Key selection is only available in the AI Studio environment.",
        type: 'error'
      });
    }
  };

  return (
    <header className="bg-white px-6 pt-10 pb-6 border-b border-slate-100 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            {view === 'treasure' ? (
              <>TREASURE <span className="opacity-20">/</span> BOX</>
            ) : (
              <>VAULT <span className="opacity-20">/</span> {(config?.label || 'UNKNOWN').toUpperCase()}</>
            )}
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
          <div className="flex gap-2">
            {view === 'treasure' && onShare && (
              <button 
                onClick={onShare}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                title="Share Treasure Box"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
            <button 
              onClick={onBack}
              className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default VaultHeader;
