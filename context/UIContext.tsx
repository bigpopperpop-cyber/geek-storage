
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MessageConfig {
  title: string;
  message: string;
  type?: 'info' | 'error' | 'success';
}

interface UIContextType {
  showMessage: (config: MessageConfig) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messageConfig, setMessageConfig] = useState<MessageConfig | null>(null);

  const showMessage = React.useCallback((config: MessageConfig) => {
    setMessageConfig(config);
  }, []);

  const closeMessage = React.useCallback(() => {
    setMessageConfig(null);
  }, []);

  const contextValue = React.useMemo(() => ({ showMessage }), [showMessage]);

  return (
    <UIContext.Provider value={contextValue}>
      {children}
      {messageConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 ${
              messageConfig.type === 'error' ? 'bg-red-50 text-red-600' : 
              messageConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
              'bg-indigo-50 text-indigo-600'
            }`}>
              {messageConfig.type === 'error' ? '⚠️' : messageConfig.type === 'success' ? '✅' : 'ℹ️'}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{messageConfig.title}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">{messageConfig.message}</p>
            
            <button
              onClick={closeMessage}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all hover:bg-slate-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
