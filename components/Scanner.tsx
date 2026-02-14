
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
      setStatus('Identifying via OCR...');
      
      try {
        const data = await identifyAndAppraise(base64, category);
        if (data) {
          setStatus('Finalizing Appraisal...');
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
        alert("Scan failed. Ensure you align the back of the card within the frame for best OCR results.");
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col items-center gap-8 py-12 animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
      <div className="relative">
        {/* Professional Target Frame */}
        <div className="w-52 h-72 bg-slate-50 rounded-3xl flex items-center justify-center text-6xl shadow-inner border-2 border-slate-100 relative overflow-hidden">
          {processing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm z-20">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">{status}</p>
            </div>
          ) : (
            <span className="opacity-10">📸</span>
          )}
          
          {/* Alignment Corners */}
          <div className="absolute inset-6 border border-dashed border-indigo-200 rounded-2xl pointer-events-none">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
          </div>

          {/* Animated Scan Line */}
          {processing && (
            <div className="absolute left-0 right-0 h-1 bg-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-scan z-10"></div>
          )}
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-900 leading-tight">Expert AI Cataloger</h2>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest px-8">
          Position the <span className="text-indigo-600">back</span> of the {category === 'coins' ? 'coin' : 'card'} to auto-detect stats & year.
        </p>
      </div>

      {!processing && (
        <div className="w-full space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Capture Item
          </button>
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleCapture} />
          <button onClick={onCancel} className="w-full text-slate-300 font-black uppercase text-[10px] tracking-widest py-2">
            Cancel
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
