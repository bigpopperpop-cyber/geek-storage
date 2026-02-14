
import React, { useState, useRef } from 'react';
import { VaultType, VaultItem } from '../types';
import { identifyCollectible } from '../services/geminiService';

interface ScannerProps {
  category: VaultType;
  onCancel: () => void;
  onResult: (item: VaultItem) => void;
}

const Scanner: React.FC<ScannerProps> = ({ category, onCancel, onResult }) => {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setProcessing(true);
      setStatus('Identifying Item...');
      
      try {
        setStatus('Identifying...');
        const data = await identifyCollectible(base64, category);
        
        if (data) {
          setStatus('Finalizing...');
          const newItem: VaultItem = {
            id: Date.now().toString(36),
            category,
            ...data,
            condition: 'Standard',
            dateAdded: new Date().toISOString(),
            lastValued: new Date().toISOString(),
            image: base64
          };
          onResult(newItem);
        }
      } catch (err) {
        console.error(err);
        alert("Could not identify item. Try a clearer photo with good lighting.");
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col items-center gap-10 py-16 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="relative">
        <div className="w-28 h-28 bg-indigo-50 rounded-full flex items-center justify-center text-5xl shadow-inner border border-indigo-100">
          📸
        </div>
        {processing && (
          <div className="absolute -inset-2 border-2 border-dashed border-indigo-400 rounded-full animate-spin duration-[3000ms]"></div>
        )}
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Vault Scanner</h2>
        <p className="text-sm text-slate-400 font-medium px-4 leading-relaxed">
          Position your {category === 'coins' ? 'coin' : 'card'} in good light. Our AI will identify it and research its value instantly.
        </p>
      </div>

      {processing ? (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full animate-progress-indeterminate w-1/2"></div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{status}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Powered by Google Search Grounding</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Capture Item
          </button>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            onChange={handleCapture} 
            className="hidden" 
          />
          <button
            onClick={onCancel}
            className="w-full bg-white text-slate-400 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest border border-slate-100 hover:bg-slate-50 transition-colors"
          >
            Back to Vault
          </button>
        </div>
      )}

      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
