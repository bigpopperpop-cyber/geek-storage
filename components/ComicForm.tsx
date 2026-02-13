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

/**
 * Optimized image preparation for multimodal AI.
 * target 'ai' uses high resolution for OCR and feature detection.
 * target 'storage' uses aggressive compression to preserve device space.
 */
const prepareImage = (base64: string, target: 'ai' | 'storage'): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Maximize resolution for AI to capture micro-text (set symbols, issue numbers)
      // 3072px provides roughly 3K resolution for superior OCR clarity
      const maxWidth = target === 'ai' ? 3072 : 800;
      const quality = target === 'ai' ? 0.98 : 0.6;
      
      let width = img.width;
      let height = img.height;
      
      // Only resize if the source is larger than our target
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height *= maxWidth / width;
          width = maxWidth;
        } else {
          width *= maxWidth / height;
          height = maxWidth;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Apply high-quality smoothing for clear OCR
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
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
        setStatusMsg("Optimizing for Deep Scan...");
        try {
          // Prepare low-res version for database storage
          const lowRes = await prepareImage(rawBase64, 'storage');
          setStorageImage(lowRes);

          // Prepare ultra high-res version for Gemini's vision
          const highRes = await prepareImage(rawBase64, 'ai');
          
          setStatusMsg("AI Identification in progress...");
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
            setStatusMsg("AI: Match confirmed!");
            setTimeout(() => setStatusMsg(null), 3000);
          } else {
            setStatusMsg("AI unclear. Adjust lighting or enter manually.");
            setTimeout(() => setStatusMsg(null), 5000);
          }
        } catch (err) {
          console.error("Auto-identification failed", err);
          setStatusMsg("Scan Error. Manual entry required.");
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
    setStatusMsg("Calculating market value...");
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
      console.error("Valuation failed:", err);
      onSave({
        id: generateId(),
        category: activeVault,
        ...formData,
        estimatedValue: 0,
        aiJustification: "Market search failed",
        imageUrl: storageImage,
        dateAdded: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setStatusMsg(null);
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

        <div className="mb-6 text-center">
          <div 
            onClick={() => !identifying && !loading && fileInputRef.current?.click()}
            className={`w-full aspect-[3/4] max-w-[180px] mx-auto bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative transition-all active:scale-95 ${identifying || loading ? 'cursor-not-allowed opacity-80' : 'hover:border-indigo-400'}`}
          >
            {storageImage ? (
              <div className="relative w-full h-full">
                <img src={storageImage} className="w-full h-full object-cover" />
                {(identifying || loading) && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-[2px]">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3"></div>
                    <p className="text-[9px] text-white font-black uppercase tracking-widest text-center px-4 leading-tight">{statusMsg || 'Working...'}</p>
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-indigo-400 animate-[scan_2s_infinite] shadow-[0_0_15px_rgba(129,140,248,0.9)]"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-4">
                <svg className="w-10 h-10 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <p className="text-[10px] text-gray-400 mt-3 font-black uppercase tracking-widest">Take Photo</p>
                <p className="text-[8px] text-gray-400 mt-1 uppercase italic font-medium">3K High-Res Vision</p>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>
          {statusMsg && !identifying && !loading && (
            <div className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-3 py-2 rounded-xl mt-4 text-center border border-amber-100 uppercase tracking-tight animate-in fade-in zoom-in-95">
              {statusMsg}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.title}</label>
            <input
              type="text" required
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse opacity-50' : ''}`}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder={identifying ? "Analyzing image..." : "Title / Player"}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.sub}</label>
            <input
              type="text" required
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse opacity-50' : ''}`}
              value={formData.subTitle}
              onChange={(e) => setFormData({...formData, subTitle: e.target.value})}
              placeholder={identifying ? "..." : "Issue / Card #"}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Year</label>
            <input
              type="text"
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse opacity-50' : ''}`}
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
              placeholder={identifying ? "..." : "YYYY"}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Key Features / Significance</label>
            <input
              type="text"
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse opacity-50' : ''}`}
              value={formData.keyFeatures}
              onChange={(e) => setFormData({...formData, keyFeatures: e.target.value})}
              placeholder={identifying ? "Checking keys..." : "1st Appearance, Rookie, etc."}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.provider}</label>
            <input
              type="text"
              className={`w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200 transition-all ${identifying ? 'animate-pulse opacity-50' : ''}`}
              value={formData.provider}
              onChange={(e) => setFormData({...formData, provider: e.target.value})}
              placeholder={identifying ? "..." : "Publisher / Brand"}
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
            (loading || identifying) ? 'bg-gray-300 cursor-not-allowed shadow-none' : `${labels.accent} shadow-lg active:scale-95`
          }`}
        >
          {loading ? 'Consulting Market...' : identifying ? 'Processing High-Res...' : 'Verify & Add to Vault'}
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(240px); opacity: 0; }
        }
      `}</style>
    </form>
  );
};

export default ItemForm;