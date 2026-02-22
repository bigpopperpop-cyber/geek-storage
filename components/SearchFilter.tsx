
import React, { useState } from 'react';
import { Search, Filter, Sparkles, X } from 'lucide-react';

interface SearchFilterProps {
  onSearch: (query: string, isAI: boolean) => void;
  onFilterChange: (filters: FilterState) => void;
  isSearching: boolean;
}

export interface FilterState {
  year: string;
  brand: string;
  minValue: number;
  maxValue: number;
  rarity: string;
  condition: string;
}

const SearchFilter: React.FC<SearchFilterProps> = ({ onSearch, onFilterChange, isSearching }) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    year: '',
    brand: '',
    minValue: 0,
    maxValue: 1000000,
    rarity: '',
    condition: ''
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, false);
  };

  const handleAISearch = () => {
    if (query.trim()) {
      onSearch(query, true);
    }
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const reset = { year: '', brand: '', minValue: 0, maxValue: 1000000, rarity: '', condition: '' };
    setFilters(reset);
    onFilterChange(reset);
    setQuery('');
    onSearch('', false);
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="relative flex-grow">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          {query && (
            <button 
              type="button"
              onClick={() => { setQuery(''); onSearch('', false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </form>
        
        <button
          onClick={handleAISearch}
          disabled={isSearching || !query.trim()}
          className={`px-4 rounded-2xl flex items-center justify-center gap-2 transition-all ${
            isSearching || !query.trim() 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95'
          }`}
          title="AI Smart Search"
        >
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">AI Search</span>
        </button>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-3 rounded-2xl border transition-all ${
            showFilters ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year</label>
              <input
                type="text"
                value={filters.year}
                onChange={(e) => updateFilter('year', e.target.value)}
                placeholder="e.g. 1996"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand</label>
              <input
                type="text"
                value={filters.brand}
                onChange={(e) => updateFilter('brand', e.target.value)}
                placeholder="e.g. Topps"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rarity</label>
              <input
                type="text"
                value={filters.rarity}
                onChange={(e) => updateFilter('rarity', e.target.value)}
                placeholder="e.g. Rare"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition</label>
              <input
                type="text"
                value={filters.condition}
                onChange={(e) => updateFilter('condition', e.target.value)}
                placeholder="e.g. Mint"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min Value ($)</label>
              <input
                type="number"
                value={filters.minValue}
                onChange={(e) => updateFilter('minValue', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Value ($)</label>
              <input
                type="number"
                value={filters.maxValue}
                onChange={(e) => updateFilter('maxValue', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={clearFilters}
            className="w-full mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest py-2 hover:bg-indigo-50 rounded-xl transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
