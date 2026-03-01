
import React, { useState, useRef } from 'react';
import { VaultType, VaultItem } from '../types';
import { identifyItemFromImage, appraiseIdentifiedItem } from '../services/geminiService';

interface ScannerProps {
  category: VaultType;
  onCancel: () => void;
  onResult: (item: VaultItem) => void;
}

const resizeImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1600;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

const Scanner: React.FC<ScannerProps> = ({ category, onCancel, onResult }) => {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'fast' | 'intelligence'>('fast');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;
    lastFileRef.current = file;
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      setProcessing(true);
      setStatus('Optimizing Image...');
      
      try {
        const base64 = await resizeImage(rawBase64);
        
        // Step 1: Visual Identification
        setStatus('Identifying Card...');
        const identified = await identifyItemFromImage(base64, category, scanMode);
        
        if (!identified || !identified.name) {
          throw new Error("Could not identify the item. Please try a clearer photo.");
        }

        // Step 2: Market Research
        setStatus(`Found: ${identified.name}. Researching Value...`);
        let data;
        try {
          data = await appraiseIdentifiedItem(identified, category);
        } catch (appraisalErr) {
          console.warn("Appraisal failed, but identification succeeded:", appraisalErr);
          // Fallback to identified data with zero value
          data = {
            title: identified.name,
            subTitle: identified.cardNumber ? `#${identified.cardNumber}` : '',
            year: identified.year,
            brand: identified.brand,
            cardNumber: identified.cardNumber,
            significance: "Identified via Vision (Market Research failed)",
            rarity: "Unknown",
            condition: "Raw",
            estimatedValue: 0,
            facts: ["Could not fetch real-time market data. Please update manually."],
            sources: []
          };
        }
        
        if (data) {
          setStatus('Finalizing...');
          onResult({
            id: Date.now().toString(36),
            category,
            ...data,
            condition: data.condition || 'Raw/Ungraded',
            rarity: data.rarity,
            dateAdded: new Date().toISOString(),
            lastValued: new Date().toISOString(),
            image: base64
          });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Unknown error occurred.");
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col items-center gap-8 py-12 animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
      <div className="relative">
        <div className="w-56 h-72 bg-slate-50 rounded-[2rem] flex items-center justify-center text-6xl shadow-inner border-2 border-slate-100 relative overflow-hidden">
          {processing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-20 px-6 text-center">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">{status}</p>
              <p className="text-[8px] text-slate-400 mt-2">Retrying if busy...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/90 backdrop-blur-sm z-20 px-6 text-center">
              <span className="text-4xl mb-3">⚠️</span>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Error</p>
              <p className="text-[9px] text-slate-600 leading-tight mb-4">{error}</p>
              <button 
                onClick={() => lastFileRef.current && handleCapture(lastFileRef.current)}
                className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg active:scale-95 transition-all"
              >
                Retry Scan
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-10">
              <span className="text-7xl">🔭</span>
            </div>
          )}
          
          <div className="absolute inset-6 border border-dashed border-indigo-200/50 rounded-2xl pointer-events-none">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
          </div>

          {processing && (
            <div className="absolute left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-scan-fast z-10"></div>
          )}
          
          {!processing && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 text-[10px] font-black text-slate-500 shadow-sm">
              3X OPTIMIZED
            </div>
          )}
        </div>
      </div>

      <div className="text-center space-y-3 px-4">
        <h2 className="text-2xl font-black text-slate-900 leading-tight">Telephoto Cataloger</h2>
        
        <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
          <button 
            onClick={() => setScanMode('intelligence')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scanMode === 'intelligence' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Gemini Intelligence
          </button>
          <button 
            onClick={() => setScanMode('fast')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scanMode === 'fast' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Fast Scan
          </button>
        </div>

        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
           <p className="text-[11px] text-indigo-700 font-bold uppercase tracking-widest leading-relaxed">
            <span className="block mb-1 text-xs">{scanMode === 'intelligence' ? '✨ Intelligence Mode:' : '⚡ Fast Mode:'}</span>
            {scanMode === 'intelligence' ? 'Uses Gemini Pro for deep visual analysis and market research.' : 'Uses Gemini Flash for rapid identification.'}
          </p>
        </div>
        
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
          Hit limits? <button onClick={() => window.dispatchEvent(new CustomEvent('switch-to-search'))} className="text-indigo-600 underline">Try AI Text Search</button> or <button onClick={() => window.dispatchEvent(new CustomEvent('switch-to-manual'))} className="text-slate-600 underline">Add Manually</button>
        </p>
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
