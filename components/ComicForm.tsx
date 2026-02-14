import React, { useState, useRef } from 'react';
import { CollectionItem, ComicCondition, VaultType } from '../types';
import { assessItemValue, identifyItemFromImage } from '../services/geminiService';

interface ItemFormProps {
  onSave: (item: CollectionItem) => void;
  activeVault: VaultType;
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const prepareImage = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 3072px provides 9MP resolution, massive detail for reading card text
      const maxWidth = 3072;
      const quality = 0.98;
      
      let width = img.width;
      let height = img.height;
      
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
  const [hasScanned, setHasScanned] = useState(false);
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
        setStatusMsg("Generating 3K Scan...");
        try {
          const processedImg = await prepareImage(rawBase64);
          
          setStatusMsg("AI Identification Active...");
          const details = await identifyItemFromImage(processedImg, activeVault);
          
          if (details && details.title) {
            setFormData(prev => ({
              ...prev,
              title: details.title || '',
              subTitle: details.subTitle || '',
              provider: details.provider || '',
              year: details.year || '',
              keyFeatures: details.keyFeatures || '',
              condition: (details.condition as ComicCondition) || prev.condition,
            }));
            setHasScanned(true);
            setStatusMsg("AI Identified Successfully!");
            setTimeout(() => setStatusMsg(null), 3000);
          } else {
            setStatusMsg("AI identification missed. Verify details.");
          }
        } catch (err) {
          console.error("Auto-identification failed", err);
          setStatusMsg("Scan Error. Manual entry active.");
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
    setStatusMsg("Consulting market values...");
    try {
      const valuation = await assessItemValue(formData, activeVault);

      const newItem: CollectionItem = {
        id: generateId(),
        category: activeVault,
        ...formData,
        estimatedValue: typeof valuation.value === 'number' ? valuation.value : 0,
        aiJustification: valuation.justification || "Manual entry",
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
        aiJustification: "Valuation error",
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
          Add to Vault
        </h2>

        <div className="mb-6 text-center">
          <div 
            onClick={() => !identifying && !loading && fileInputRef.current?.click()}
            className={`w-full aspect-square max-w-[140px] mx-auto bg-gray-50 rounded-full border-4 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer relative transition-all active:scale-95 ${identifying || loading ? 'cursor-not-allowed opacity-80' : 'hover:border-indigo-400 shadow-sm'}`}
          >
            {hasScanned && !identifying ? (
              <div className="flex flex-col items-center text-green-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[10px] font-black mt-2 uppercase tracking-widest">Scanned</span>
              </div>
            ) : identifying ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-[10px] font-black text-indigo-600 mt-3 uppercase tracking-widest">Scanning</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-300">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <span className="text-[10px] font-black mt-2 uppercase tracking-widest">Ultra Scan</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>
          {statusMsg && (
            <div className={`inline-block px-3 py-1.5 rounded-xl mt-4 text-[10px] font-bold uppercase tracking-tight border animate-in fade-in zoom-in-95 ${statusMsg.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
              {statusMsg}
            </div>
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
              placeholder="Title / Player Name"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.sub}</label>
            <input
              type="text" required
              className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200"
              value={formData.subTitle}
              onChange={(e) => setFormData({...formData, subTitle: e.target.value})}
              placeholder="# / Set"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Year</label>
            <input
              type="text"
              className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200"
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
              placeholder="YYYY"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Significance / Rarity</label>
            <input
              type="text"
              className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200"
              value={formData.keyFeatures}
              onChange={(e) => setFormData({...formData, keyFeatures: e.target.value})}
              placeholder="e.g. Rookie Card, Holo"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{labels.provider}</label>
            <input
              type="text"
              className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-200"
              value={formData.provider}
              onChange={(e) => setFormData({...formData, provider: e.target.value})}
              placeholder="Brand / Publisher"
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
            (loading || identifying) ? 'bg-gray-300' : `${labels.accent} shadow-lg active:scale-95`
          }`}
        >
          {loading ? 'Consulting Market...' : 'Vault & Appraise'}
        </button>
      </div>
    </form>
  );
};

export default ItemForm;