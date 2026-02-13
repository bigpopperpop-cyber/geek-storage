
import React from 'react';

const Instructions: React.FC = () => {
  const steps = [
    {
      title: "Snap & Identify",
      desc: "Tap the photo area in the 'Add' screen. Our AI analyzes the image to automatically fill in the title, issue, and year for you.",
      icon: "📸"
    },
    {
      title: "AI Appraisal",
      desc: "Once identified, tap 'AI Appraisal'. We check current market trends for your specific item and condition to give you a fair estimate.",
      icon: "💎"
    },
    {
      title: "High-Capacity Storage",
      desc: "We use IndexedDB to store your collection. This allows for thousands of items and photos without running out of space.",
      icon: "🏢"
    },
    {
      title: "Private & Local",
      desc: "All your data stays 100% on your device. No cloud, no accounts, just your private vault on your phone.",
      icon: "🔒"
    }
  ];

  const paypalUrl = "https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=gizmooo@yahoo.com&item_name=Cup+of+coffee+for+Vault+AI&currency_code=USD";

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl">
        <h2 className="text-2xl font-black italic comic-font mb-2">COLLECTOR'S GUIDE</h2>
        <p className="text-indigo-100 text-sm font-medium">Master your vault with high-capacity AI tools.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4 items-start">
            <div className="text-3xl bg-gray-50 p-3 rounded-2xl shrink-0">{step.icon}</div>
            <div>
              <h3 className="font-black text-gray-900 mb-1 uppercase text-sm tracking-tight">{step.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-sky-50 p-6 rounded-3xl border border-sky-100">
        <h3 className="text-sky-800 font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Pro Tip: Image Handling
        </h3>
        <p className="text-sky-700 text-[11px] leading-tight font-medium">
          Images are automatically compressed to save space, but our database is built to handle massive collections. You can store hundreds of graded comics or cards with ease!
        </p>
      </div>

      <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col items-center text-center">
        <div className="text-2xl mb-2">☕</div>
        <h3 className="text-orange-900 font-black text-xs uppercase tracking-tight mb-1">Support the Gizmo</h3>
        <p className="text-orange-700 text-[10px] leading-tight mb-4 max-w-[200px]">
          Love the app? Consider buying the developer a coffee to keep the AI brain powered up!
        </p>
        <a 
          href={paypalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-orange-500 hover:bg-orange-600 text-white font-black py-3 px-6 rounded-2xl text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-2"
        >
          Buy me a coffee ☕
        </a>
      </div>

      <div className="text-center px-6">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
          Powered by Gemini 3 Flash • High-Capacity IndexedDB v3.0
        </p>
      </div>
    </div>
  );
};

export default Instructions;
