
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
      setStatus('Identifying...');
      
      try {
        const data = await identifyAndAppraise(base64, category);
        if (data) {
          setStatus('Finalizing...');
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
        alert("Scan failed. Try again in better light.");
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 flex flex-col items-center gap-10 py-16 animate-in slide-in-from-bottom-10">
      <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center text-6xl shadow-inner border border-slate-100 relative overflow-hidden">
        {processing ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : "📸"}
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900 leading-tight">Add to Vault</h2>
        <p className="text-sm text-slate-400 font-medium mt-2">Identify Rookies, 1st Appearances & Market Value</p>
      </div>

      {processing ? (
        <p className="text-xs font-black text-indigo-600 uppercase tracking-widest animate-pulse">{status}</p>
      ) : (
        <div className="w-full space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Start Deep Scan
          </button>
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleCapture} />
          <button onClick={onCancel} className="w-full text-slate-400 font-bold uppercase text-[10px] tracking-widest py-2">
            Maybe Later
          </button>
        </div>
      )}
    </div>
  );
};

export default Scanner;
