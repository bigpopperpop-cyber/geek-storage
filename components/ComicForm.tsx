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

// Helper to compress images to avoid LocalStorage QuotaExceeded errors
const compressImage = (base64: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
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
      // Use JPEG with 0.7 quality for excellent compression
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64); // Fallback to original if error
  });
};

const ItemForm: React.FC<ItemFormProps> = ({ onSave, activeVault }) => {
  const [loading, setLoading] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [image, setImage] = useState<string | undefined>();
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
        const base64 = reader.result as string;
        
        // Compress the image before setting state
        const compressed = await compressImage(base64);
        setImage(compressed);
        
        // Auto-identify using the compressed version (saves bandwidth/latency too)
        setIdentifying(true);
        try {
          const details = await identifyItemFromImage(compressed, activeVault);
          if (details) {
            setFormData(prev => ({
              ...prev,
              title: details.title || prev.title,
              subTitle: details.subTitle || prev.subTitle,
              provider: details.provider || prev.provider,
              year: details.year || prev.year,
              keyFeatures: details.keyFeatures || prev.keyFeatures,
              condition: (details.condition as ComicCondition) || prev.condition
            }));
          }
        } catch (err) {
          console.error("Auto-identification failed", err);
        } finally {
          setIdentifying(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subTitle) return;

    setLoading(true);
    try {
      const valuation = await assessItemValue(formData, activeVault);

      const newItem: CollectionItem = {
        id: generateId(),
        category: activeVault,
        ...formData,
        estimatedValue: typeof valuation.value === 'number' ? valuation.value : 0,
        aiJustification: valuation.justification || "N/A",
        imageUrl: image,
        dateAdded: new Date().toISOString(),
      };

      // Wrap in timeout to ensure state transitions don't block
      setTimeout(() => {
        onSave(newItem);
      }, 10);
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
            {image ? (
              <div className="relative w-full h-full">
                <img src={image} className="w-full h-full object-cover" />
                {identifying && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
                    <p className="text-[10px] text-white font-black uppercase tracking-widest">Scanning...</p>
                    <div className="absolute inset-0 w-full h-1 bg-white/50 animate-[scan_2s_infinite]"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-4">
                <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Snap Photo</p>
                <p className="text-[8px] text-gray-400 mt-1 uppercase italic">AI will fill fields</p>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.title}</label>
            <input
              type="text" required
              placeholder={identifying ? 'Identifying...' : ''}
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.sub}</label>
            <input
              type="text" required
              placeholder={identifying ? '...' : ''}
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.subTitle}
              onChange={(e) => setFormData({...formData, subTitle: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Year</label>
            <input
              type="text"
              placeholder={identifying ? '...' : ''}
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Significance / Key Features</label>
            <input
              type="text"
              placeholder={identifying ? 'Checking rarity...' : 'e.g. Rookie Card, 1st Appearance'}
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse' : ''}`}
              value={formData.keyFeatures}
              onChange={(e) => setFormData({...formData, keyFeatures: e.target.value})}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.provider}</label>
            <input
              type="text"
              placeholder={identifying ? 'Detecting publisher...' : ''}
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
          {loading ? 'AI Valuating...' : identifying ? 'Waiting for Identity...' : 'AI Appraisal & Add'}
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </form>
  );
};

export default ItemForm;