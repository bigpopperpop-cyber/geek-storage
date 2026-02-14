
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
      setStatus('Processing Macro Scan...');
      
      try {
        const data = await identifyAndAppraise(base64, category);
        if (data) {
          setStatus('Analyzing Significance...');
          onResult({
            id: Date.now().toString(36),
            category,
            ...data,
            condition: 'Raw/Ungraded',
            dateAdded: new Date().toISOString(),
            lastValued: new Date().toISOString(),
            image: base64
          });
        }
      } catch (err) {
        console.error(err);
        alert("Scan failed. Try using your phone's 3x zoom and focus clearly on the small text area.");
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col items-center gap-8 py-12 animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
      <div className="relative">
        {/* Pro Telephoto Target Frame */}
        <div className="w-56 h-72 bg-slate-50 rounded-[2rem] flex items-center justify-center text-6xl shadow-inner border-2 border-slate-100 relative overflow-hidden">
          {processing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-20 px-6 text-center">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">{status}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-10">
              <span className="text-7xl">🔭</span>
            </div>
          )}
          
          {/* Alignment Frame for Zoomed Shots */}
          <div className="absolute inset-6 border border-dashed border-indigo-200/50 rounded-2xl pointer-events-none">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
            
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 opacity-30">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-500"></div>
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-indigo-500"></div>
            </div>
          </div>

          {/* Animated Macro Scan Line */}
          {processing && (
            <div className="absolute left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-scan-fast z-10"></div>
          )}
          
          {/* Zoom Level Indicator (Visual Only) */}
          {!processing && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 text-[10px] font-black text-slate-500 shadow-sm">
              3X OPTIMIZED
            </div>
          )}
        </div>
      </div>

      <div className="text-center space-y-3 px-4">
        <h2 className="text-2xl font-black text-slate-900 leading-tight">Telephoto Cataloger</h2>
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
           <p className="text-[11px] text-indigo-700 font-bold uppercase tracking-widest leading-relaxed">
            <span className="block mb-1 text-xs">📸 Pro Tip:</span>
            Stand back and use your <span className="underline">3x zoom</span> button to focus on the small stats & card number.
          </p>
        </div>
      </div>

      {!processing && (
        <div className="w-full space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Capture Detail
          </button>
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleCapture} />
          <button onClick={onCancel} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest py-2 hover:text-slate-600 transition-colors">
            Return to Vault
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan-fast {
          0% { top: 15%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        .animate-scan-fast {
          animation: scan-fast 1.8s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
