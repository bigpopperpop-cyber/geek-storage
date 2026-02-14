
import React, { useState, useRef } from 'react';
import { VaultType, VaultItem } from '../types';
import { identifyAndAppraise } from '../services/geminiService';

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
      setStatus('Deep Scanning...');
      
      try {
        const data = await identifyAndAppraise(base64, category);
        if (data) {
          setStatus('Adding to Vault...');
          onResult({
            id: Date.now().toString(36),
            category,
            ...data,
            condition: 'Ungraded',
            dateAdded: new Date().toISOString(),
            lastValued: new Date().toISOString(),
            image: base64
          });
        }
      } catch (err) {
        console.error(err);
        alert("Scan failed. Ensure you align the card within the frame and try again.");
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100 flex flex-col items-center gap-8 py-12 animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
      <div className="relative group">
        {/* Visual Target Frame for alignment */}
        <div className="w-48 h-64 bg-slate-50 rounded-3xl flex items-center justify-center text-6xl shadow-inner border-2 border-slate-100 relative overflow-hidden transition-all duration-300">
          {processing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">{status}</p>
              </div>
            </div>
          ) : (
            <span className="opacity-20 group-hover:scale-110 transition-transform">📸</span>
          )}
          
          {/* Target Frame Overlay */}
          <div className="absolute inset-4 border-2 border-dashed border-indigo-400/30 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500 rounded-br-lg"></div>
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest opacity-40">Align {category === 'coins' ? 'Coin' : 'Card'}</span>
          </div>
          
          {/* Scan Line Animation */}
          {processing && (
            <div className="absolute left-0 right-0 h-1 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-scan-line z-10"></div>
          )}
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-900 leading-tight">Expert Cataloger</h2>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
          Position the <span className="text-indigo-600">back</span> of the item for best results.
        </p>
      </div>

      {!processing && (
        <div className="w-full space-y-3 px-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Capture Image
          </button>
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleCapture} />
          <button 
            onClick={onCancel} 
            className="w-full text-slate-400 font-bold uppercase text-[9px] tracking-widest py-3 border border-transparent hover:border-slate-100 rounded-xl transition-all"
          >
            Cancel Session
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan-line {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan-line {
          animation: scan-line 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
