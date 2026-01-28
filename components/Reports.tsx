
import React, { useMemo, useState } from 'react';
import { CollectionItem, VaultType } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface ReportsProps {
  items: CollectionItem[];
  activeVault: VaultType;
  onDelete: (id: string) => void;
  onClearVault: (vault: VaultType) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#eab308'];

const Reports: React.FC<ReportsProps> = ({ items, activeVault, onDelete, onClearVault }) => {
  const [sortKey, setSortKey] = useState<keyof CollectionItem>('estimatedValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredItems = useMemo(() => 
    items.filter(c => c.category === activeVault), 
    [items, activeVault]
  );

  const stats = useMemo(() => {
    const totalValue = filteredItems.reduce((sum, c) => sum + c.estimatedValue, 0);
    const avgValue = filteredItems.length ? totalValue / filteredItems.length : 0;
    const providerData = filteredItems.reduce((acc: any, c) => {
      const p = c.provider || 'Unknown';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    const pieData = Object.keys(providerData).map(name => ({
      name,
      value: providerData[name]
    }));

    return { totalValue, avgValue, pieData };
  }, [filteredItems]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      }
      return sortOrder === 'desc' 
        ? String(valB).localeCompare(String(valA))
        : String(valA).localeCompare(String(valB));
    });
  }, [filteredItems, sortKey, sortOrder]);

  const toggleSort = (key: keyof CollectionItem) => {
    if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder('desc'); }
  };

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="font-medium text-center px-10">No {activeVault} items recorded yet. Add some items to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">📊 Analytics</h2>
          <button 
            onClick={() => onClearVault(activeVault)}
            className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-tighter"
          >
            Clear {activeVault} Vault
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Vault Value</p>
            <p className="text-2xl font-black text-gray-900">${stats.totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl">
            <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Avg. Price</p>
            <p className="text-2xl font-black text-gray-900">${Math.round(stats.avgValue).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                {stats.pieData.map((_, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
           <h2 className="font-bold">Catalog Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-tighter">
              <tr>
                <th onClick={() => toggleSort('title')} className="px-6 py-3 cursor-pointer">Item</th>
                <th onClick={() => toggleSort('estimatedValue')} className="px-4 py-3 cursor-pointer text-right">Value</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{item.title}</div>
                    <div className="text-[10px] text-gray-400">{item.provider} • {item.subTitle}</div>
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-gray-900">
                    ${item.estimatedValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Reports;
