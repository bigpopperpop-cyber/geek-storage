
import React, { useState, useEffect, useMemo } from 'react';
import { VaultItem, VAULT_CONFIG } from '../types';
import { getCollectionInsights } from '../services/geminiService';
import { exportCollection, importCollection } from '../services/storageService';
import { Sparkles, TrendingUp, PieChart as PieChartIcon, BarChart3, Download, Upload, ShieldCheck, Share2, Printer, MessageSquare } from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend 
} from 'recharts';

export default function Reports({ items, onRefresh }: { items: VaultItem[], onRefresh?: () => void }) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastInsightCount, setLastInsightCount] = useState(-1);
  const categories = Object.keys(VAULT_CONFIG) as (keyof typeof VAULT_CONFIG)[];

  useEffect(() => {
    // Only load insights if we haven't loaded them for this collection size yet
    if (items.length > 0 && items.length !== lastInsightCount && insights.length === 0) {
      // We don't auto-load anymore to save API quota
    }
  }, [items, lastInsightCount, insights.length]);

  const fetchInsights = async () => {
    if (items.length === 0) return;
    setLoadingInsights(true);
    try {
      const newInsights = await getCollectionInsights(items);
      setInsights(newInsights);
      setLastInsightCount(items.length);
    } catch (err: any) {
      console.error(err);
      alert("Could not fetch insights: " + (err.message || "Unknown error"));
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      await importCollection(file);
      alert('Collection restored successfully!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const chartData = useMemo(() => {
    return categories.map(cat => {
      const catItems = items.filter(i => i.category === cat);
      const value = catItems.reduce((a, b) => a + (b.estimatedValue || 0), 0);
      return {
        name: VAULT_CONFIG[cat].label,
        value,
        count: catItems.length,
        color: VAULT_CONFIG[cat].color,
        icon: VAULT_CONFIG[cat].icon
      };
    }).filter(d => d.count > 0);
  }, [items, categories]);

  const totalValue = items.reduce((a, b) => a + (b.estimatedValue || 0), 0);
  
  const handleShare = async () => {
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      
      if (!response.ok) throw new Error('Failed to create share link');
      
      const { shareId } = await response.json();
      const shareUrl = `${window.location.origin}?share=${shareId}`;
      const summary = `My ${items.length} item collection is valued at $${totalValue.toLocaleString()}! Check out Vault AI.`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My Vault AI Collection',
            text: summary,
            url: shareUrl
          });
        } catch (err) {
          console.error('Share error:', err);
        }
      } else {
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(`${summary}\n${shareUrl}`);
          alert('Share link copied to clipboard!');
        } catch (err) {
          alert('Failed to copy share link.');
        }
      }
    } catch (err) {
      console.error("Share error:", err);
      alert("Failed to create share link. Please try again.");
    }
  };

  const handleSMS = async () => {
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      
      if (!response.ok) throw new Error('Failed to create share link');
      
      const { shareId } = await response.json();
      const shareUrl = `${window.location.origin}?share=${shareId}`;
      const summary = `My ${items.length} item collection is valued at $${totalValue.toLocaleString()}! Check out Vault AI: ${shareUrl}`;
      window.location.href = `sms:?body=${encodeURIComponent(summary)}`;
    } catch (err) {
      console.error("SMS error:", err);
      alert("Failed to create share link. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      {/* Print-only Table (Hidden in UI) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans">
        <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Collection Inventory</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Portfolio Value</p>
            <p className="text-2xl font-black">${totalValue.toLocaleString()}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
              <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
              <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(VAULT_CONFIG) as Array<keyof typeof VAULT_CONFIG>).map(catKey => {
              const categoryItems = items.filter(i => i.category === catKey);
              if (categoryItems.length === 0) return null;
              
              return (
                <React.Fragment key={catKey}>
                  <tr className="bg-slate-50">
                    <td colSpan={3} className="py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-900 border-b border-slate-200">
                      {VAULT_CONFIG[catKey].label} ({categoryItems.length} items)
                    </td>
                  </tr>
                  {categoryItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 px-4">
                        <p className="text-xs font-black text-slate-900">{item.title}</p>
                        <p className="text-[10px] font-bold text-slate-500">{item.subTitle} ({item.year})</p>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{VAULT_CONFIG[item.category].label}</span>
                      </td>
                      <td className="py-3 text-right pr-4">
                        <p className="text-xs font-black text-slate-900">${(item.trueValue || item.estimatedValue || 0).toLocaleString()}</p>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        <div className="mt-12 pt-8 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vault AI - Digital Collectible Management</p>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Portfolio Performance</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter">${totalValue.toLocaleString()}</h2>
          <div className="flex gap-4 mt-6">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Assets</p>
              <p className="text-xl font-black">{items.length}</p>
            </div>
            <div className="w-px h-10 bg-slate-800 self-center" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Value</p>
              <p className="text-xl font-black">${items.length ? Math.round(totalValue / items.length).toLocaleString() : 0}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 text-white/5 text-[12rem] font-black italic select-none pointer-events-none">DATA</div>
      </div>

      {/* AI Insights */}
      {items.length > 0 && (
        <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Sparkles className="w-20 h-20" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <h3 className="text-xs font-black uppercase tracking-widest">AI Strategic Insights</h3>
              </div>
              <button 
                onClick={fetchInsights}
                disabled={loadingInsights}
                className="text-[10px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {insights.length > 0 ? 'Refresh' : 'Generate'}
              </button>
            </div>
            {loadingInsights ? (
              <div className="flex items-center gap-3 py-4">
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
                <p className="text-xs font-bold text-indigo-100 animate-pulse">Consulting market data...</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {insights.map((insight, i) => (
                  <li key={i} className="flex gap-4 text-xs font-bold leading-relaxed text-indigo-50">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <p className="pt-1">{insight}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Visualizations */}
      {items.length > 0 ? (
        <div className="space-y-6">
          {/* Pie Chart: Distribution */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Value Distribution</h3>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {chartData.map((data) => (
                <div key={data.name} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                  <span className="text-[10px] font-black text-slate-500 uppercase truncate">{data.name}</span>
                  <span className="text-[10px] font-black text-slate-900 ml-auto">{Math.round((data.value / totalValue) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart: Category Comparison */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Category Comparison</h3>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest mt-2">Item Count per Category</p>
          </div>

          {/* Data Management */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Data Management</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={handleShare}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
              >
                <Share2 className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Share</span>
              </button>

              <button 
                onClick={handleSMS}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
              >
                <MessageSquare className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Text</span>
              </button>
              
              <button 
                onClick={handlePrint}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
              >
                <Printer className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Print</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={exportCollection}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
              >
                <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Backup</span>
              </button>
              
              <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer">
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  {importing ? 'Restoring...' : 'Restore'}
                </span>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImport}
                  disabled={importing}
                />
              </label>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center leading-relaxed">
              Export your collection as a JSON file for safe keeping or to transfer between devices.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-slate-200" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No data to visualize yet</p>
            <p className="text-xs text-slate-300 mt-2">Scan or add items to see your portfolio analytics</p>
          </div>
          
          <div className="pt-4">
            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer active:scale-95 transition-all">
              <Upload className="w-4 h-4" />
              {importing ? 'Restoring...' : 'Restore from Backup'}
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImport}
                disabled={importing}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
