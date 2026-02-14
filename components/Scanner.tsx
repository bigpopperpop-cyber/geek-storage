
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
      setStatus('Identifying visually...');
      
      try {
        const data = await identifyCollectible(base64, category);
        if (data) {
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
        alert("Could not identify item. Try a clearer photo.");
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center gap-8 py-16 animate-in fade-in slide-in-from-bottom-4">
      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-4xl shadow-inner border border-slate-100">
        📸
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900">Scan New Item</h2>
        <p className="text-sm text-slate-400 font-medium mt-1">Take a photo of your {category} collectible</p>
      </div>

      {processing ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-900 uppercase tracking-widest animate-pulse">{status}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
          >
            Open Camera
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
            className="w-full bg-white text-slate-400 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest border border-slate-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Scanner;
