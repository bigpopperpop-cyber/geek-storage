
import React, { useState, useRef } from 'react';
import { CollectionItem, ComicCondition, VaultType } from '../types';
import { assessItemValue, identifyItemFromImage } from '../services/geminiService';

interface ItemFormProps {
  onSave: (item: CollectionItem) => void;
  activeVault: VaultType;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const prepareImage = (base64: string, target: 'ai' | 'storage'): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = target === 'ai' ? 2048 : 800;
      const quality = target === 'ai' ? 0.9 : 0.6;
      
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width *= maxWidth / height;
          height = maxWidth;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
  });
};

const ItemForm: React.FC<ItemFormProps> = ({ onSave, activeVault }) => {
  const [loading, setLoading] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [storageImage, setStorageImage] = useState<string | undefined>();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subTitle: '',
    provider: '',
    year: '',
    keyFeatures: '',
    condition: 'Near Mint' as ComicCondition,
    notes: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const labels = {
    comics: { title: 'Comic Title', sub: 'Issue #', provider: 'Publisher', accent: 'bg-indigo-600' },
    sports: { title: 'Player Name', sub: 'Set / Number', provider: 'Manufacturer', accent: 'bg-emerald-600' },
    fantasy: { title: 'Card Name', sub: 'Set / Edition', provider: 'TCG / Game', accent: 'bg-amber-500' },
    coins: { title: 'Denomination', sub: 'Mint Mark / Variety', provider: 'Grading Service', accent: 'bg-yellow-600' },
  }[activeVault];

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        
        setIdentifying(true);
        setStatusMsg("Processing Image...");
        try {
          const lowRes = await prepareImage(rawBase64, 'storage');
          setStorageImage(lowRes);

          const highRes = await prepareImage(rawBase64, 'ai');
          setStatusMsg("AI Identifying Item...");
          
          const details = await identifyItemFromImage(highRes, activeVault);
          
          if (details && details.title) {
            setFormData(prev => ({
              ...prev,
              title: details.title || '',
              subTitle: details.subTitle || '',
              provider: details.provider || '',
              year: details.year || '',
              keyFeatures: details.keyFeatures || '',
              condition: (details.condition as ComicCondition) || prev.condition
            }));
            setStatusMsg(null);
          } else {
            setStatusMsg("AI couldn't identify this. Please enter details manually.");
            setTimeout(() => setStatusMsg(null), 4000);
          }
        } catch (err) {
          console.error("Auto-identification failed", err);
          setStatusMsg("Error connecting to AI. Manual entry required.");
        } finally {
          setIdentifying(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    setLoading(true);
    try {
      const valuation = await assessItemValue(formData, activeVault);

      const newItem: CollectionItem = {
        id: generateId(),
        category: activeVault,
        ...formData,
        estimatedValue: typeof valuation.value === 'number' ? valuation.value : 0,
        aiJustification: valuation.justification || "N/A",
        imageUrl: storageImage,
        dateAdded: new Date().toISOString(),
      };

      onSave(newItem);
    } catch (err) {
      console.error("Submission failed", err);
      alert("Failed to save item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const conditions: ComicCondition[] = [
    'Gem Mint', 'Mint', 'Near Mint', 'Very Fine', 'Fine', 'Very Good', 'Good', 'Fair', 'Poor'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Add to {activeVault.charAt(0).toUpperCase() + activeVault.slice(1)} Vault
        </h2>

        <div className="mb-6">
          <div 
            onClick={() => !identifying && !loading && fileInputRef.current?.click()}
            className={`w-full aspect-[3/4] max-w-[180px] mx-auto bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative ${identifying || loading ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            {storageImage ? (
              <div className="relative w-full h-full">
                <img src={storageImage} className="w-full h-full object-cover" />
                {identifying && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[2px]">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
                    <p className="text-[10px] text-white font-black uppercase tracking-widest text-center px-4">{statusMsg || 'Scanning...'}</p>
                    <div className="absolute inset-0 w-full h-[2px] bg-indigo-400 animate-[scan_2s_infinite] shadow-[0_0_15px_rgba(129,140,248,0.8)]"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-4">
                <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Snap Photo</p>
                <p className="text-[8px] text-gray-400 mt-1 uppercase italic">High-Res OCR Enabled</p>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>
          {statusMsg && !identifying && (
            <p className="text-center mt-2 text-[10px] font-bold text-amber-600 uppercase tracking-tighter animate-bounce">{statusMsg}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.title}</label>
            <input
              type="text" required
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.sub}</label>
            <input
              type="text" required
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.subTitle}
              onChange={(e) => setFormData({...formData, subTitle: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Year</label>
            <input
              type="text"
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Significance / Key Features</label>
            <input
              type="text"
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.keyFeatures}
              onChange={(e) => setFormData({...formData, keyFeatures: e.target.value})}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.provider}</label>
            <input
              type="text"
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.provider}
              onChange={(e) => setFormData({...formData, provider: e.target.value})}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Condition</label>
            <select
              className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 appearance-none"
              value={formData.condition}
              onChange={(e) => setFormData({...formData, condition: e.target.value as ComicCondition})}
            >
              {conditions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || identifying}
          className={`w-full mt-8 p-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 ${
            (loading || identifying) ? 'bg-gray-300 cursor-not-allowed' : `${labels.accent} shadow-lg active:scale-95`
          }`}
        >
          {loading ? 'AI Valuating...' : identifying ? 'AI Scanning...' : 'AI Appraisal & Add'}
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(240px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </form>
  );
};

export default ItemForm;
