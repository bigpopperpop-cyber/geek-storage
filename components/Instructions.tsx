
import React from 'react';

const Instructions: React.FC = () => {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-emerald-600 p-8 rounded-3xl text-white shadow-xl">
        <h2 className="text-2xl font-black italic comic-font mb-2">VAULT GUIDE</h2>
        <p className="text-emerald-100 text-sm font-medium">Simple Sports Card Database</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
          <div className="text-2xl">📸</div>
          <div>
            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-tight">Scan Card</h3>
            <p className="text-gray-500 text-[11px] leading-relaxed">Use the scan button to automatically pull the player name and set from your card. Works best with a clear photo.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
          <div className="text-2xl">💰</div>
          <div>
            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-tight">Manual Value</h3>
            <p className="text-gray-500 text-[11px] leading-relaxed">AI appraisal is removed to keep it simple. Just type in what you paid or what you think it's worth.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
          <div className="text-2xl">🔒</div>
          <div>
            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-tight">On-Device Storage</h3>
            <p className="text-gray-500 text-[11px] leading-relaxed">Everything is stored right here on your phone. No cloud, no tracking.</p>
          </div>
        </div>
      </div>

      <div className="text-center px-6 pt-10">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
          Powered by Gemini Flash • Fast Detection Mode
        </p>
      </div>
    </div>
  );
};

export default Instructions;
