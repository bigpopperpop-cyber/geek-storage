
import React, { useState, useRef } from 'react';
import { VaultItem, VAULT_CONFIG, COLLECTIBLE_CONDITIONS, COMIC_CONDITIONS } from '../types';
import { reEvaluateItem } from '../services/geminiService';
import { Camera } from 'lucide-react';
import { useUI } from '../context/UIContext';

interface DetailProps {
  item: VaultItem;
  onUpdate: (item: VaultItem) => void;
  onDelete: () => void;
  onBack: () => void;
}

const ItemDetail: React.FC<DetailProps> = ({ item, onUpdate, onDelete, onBack }) => {
  const { showMessage } = useUI();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingTrueValue, setIsEditingTrueValue] = useState(false);
  const [isEditingCondition, setIsEditingCondition] = useState(false);
  const [tempTrueValue, setTempTrueValue] = useState(item.trueValue?.toString() || '');
  const [tempCondition, setTempCondition] = useState(item.manualCondition || item.condition);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = VAULT_CONFIG[item.category];
  const conditions = item.category === 'comics' ? COMIC_CONDITIONS : COLLECTIBLE_CONDITIONS;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({
          ...item,
          image: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReValue = async () => {
    setIsUpdating(true);
    try {
      const result = await reEvaluateItem(item);
      if (result && (result.estimatedValue !== undefined || result.updatedFacts)) {
        onUpdate({
          ...item,
          estimatedValue: result.estimatedValue ?? item.estimatedValue,
          lowValue: result.lowValue ?? item.lowValue,
          highValue: result.highValue ?? item.highValue,
          facts: result.updatedFacts || item.facts,
          significance: result.significance || item.significance,
          lastValued: new Date().toISOString(),
          sources: result.sources || item.sources,
          aiJustification: result.reasoning || item.aiJustification,
          investmentOutlook: result.investmentOutlook || item.investmentOutlook
        });
      } else {
        throw new Error("No data returned from AI");
      }
    } catch (err: any) {
      console.error("In-depth search error:", err);
      showMessage({
        title: "Search Failed",
        message: "In-depth search failed. This can happen if the AI is busy or the item is very rare. Please try again in a moment.",
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const saveTrueValue = () => {
    const val = parseFloat(tempTrueValue);
    onUpdate({
      ...item,
      trueValue: isNaN(val) ? undefined : val
    });
    setIsEditingTrueValue(false);
  };

  const saveCondition = () => {
    onUpdate({
      ...item,
      manualCondition: tempCondition
    });
    setIsEditingCondition(false);
  };

  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-300">
      <div className="relative aspect-[4/3] bg-slate-900 group">
        {item.image ? (
          <img src={item.image} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" alt={item.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🖼️</div>
        )}
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-4 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30 pointer-events-auto hover:bg-white/30 transition-all active:scale-90"
            title="Update photo"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageChange} 
          accept="image/*" 
          className="hidden" 
          capture="environment"
        />

        <button 
          onClick={onBack}
          className="absolute top-6 left-6 bg-black/50 text-white p-3 rounded-full backdrop-blur-lg hover:bg-black/70 transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="p-8">
        <div className="flex justify-between items-start gap-6">
          <div className="min-w-0 flex-grow">
            <div className="flex items-center gap-2 mb-2">
               <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                {item.year} {item.brand}
              </span>
              {item.cardNumber && (
                <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-indigo-100">
                  #{item.cardNumber}
                </span>
              )}
              {item.rarity && (
                <span className="bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-amber-100">
                  {item.rarity}
                </span>
              )}
              <button 
                onClick={() => setIsEditingCondition(true)}
                className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-colors"
              >
                {item.manualCondition || item.condition}
              </button>
            </div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">{item.title}</h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter mb-1">Market Value</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">
              ${(item.estimatedValue || 0).toLocaleString()}
            </p>
            {(item.lowValue || item.highValue) && (
              <p className="text-[10px] font-bold text-slate-400 mt-1">
                Range: ${item.lowValue?.toLocaleString()} - ${item.highValue?.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Condition Editor Modal-ish */}
        {isEditingCondition && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Assess Condition</p>
            <div className="flex gap-2">
              <select 
                value={tempCondition}
                onChange={(e) => setTempCondition(e.target.value)}
                className="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                autoFocus
              >
                {conditions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                {!conditions.includes(tempCondition) && tempCondition && (
                  <option value={tempCondition}>{tempCondition}</option>
                )}
              </select>
              <button 
                onClick={saveCondition}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* True Value Section */}
        <div className="mt-8 flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your True Value</p>
            {isEditingTrueValue ? (
              <div className="flex gap-2">
                <input 
                  type="number"
                  value={tempTrueValue}
                  onChange={(e) => setTempTrueValue(e.target.value)}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 text-xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <button 
                  onClick={saveTrueValue}
                  className="bg-emerald-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Set
                </button>
              </div>
            ) : (
              <p className="text-3xl font-black tracking-tighter">
                ${(item.trueValue || item.estimatedValue || 0).toLocaleString()}
              </p>
            )}
          </div>
          <button 
            onClick={() => setIsEditingTrueValue(!isEditingTrueValue)}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>

        {item.significance && (
          <div className="mt-8 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="text-base">💎</span> Key Attribute
            </p>
            <p className="text-base font-bold text-indigo-900 leading-relaxed italic">"{item.significance}"</p>
          </div>
        )}

        {item.investmentOutlook && (
          <div className="mt-6 p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100/50">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="text-base">📈</span> Collector's Verdict
            </p>
            <p className="text-sm font-bold text-emerald-900 leading-relaxed">{item.investmentOutlook}</p>
          </div>
        )}

        <div className="mt-10">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Vault Analysis</h3>
          <ul className="space-y-4">
            {item.facts.map((fact, i) => (
              <li key={i} className="flex gap-4 text-sm font-semibold text-slate-700 leading-snug">
                <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-[11px] shrink-0 font-black">
                  {i + 1}
                </span>
                {fact}
              </li>
            ))}
          </ul>
        </div>

        {item.sources && item.sources.length > 0 && (
          <div className="mt-10">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Verified Market Sources</h3>
            <div className="flex flex-wrap gap-3">
              {item.sources.map((source, i) => (
                <a 
                  key={i} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black border border-slate-100 hover:bg-white hover:shadow-md transition-all flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {source.title.length > 24 ? source.title.substring(0, 24) + '...' : source.title}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col gap-4">
          <button
            onClick={handleReValue}
            disabled={isUpdating}
            className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              {isUpdating ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <span>{isUpdating ? 'Researching...' : 'Start In-Depth Search'}</span>
            </div>
            {!isUpdating && <span className="text-[9px] normal-case opacity-60">Exhaustive history, variations & population reports</span>}
          </button>
          
          <button
            onClick={onDelete}
            className="w-full py-4 text-red-500 font-black text-[11px] uppercase tracking-widest hover:bg-red-50 rounded-[1.5rem] transition-colors"
          >
            Purge from Vault
          </button>
          
          <div className="text-center">
             <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">
              Last Analysis: {new Date(item.lastValued).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
