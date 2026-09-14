import React from 'react';
import { 
  Package, Upload, Search, Database, Tags, 
  Sparkles, X, PlusCircle 
} from 'lucide-react';
import { Category } from '../types';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  categories: Category[];
  onOpenUpload: () => void;
  onOpenCategories: () => void;
  onOpenStorage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  categories,
  onOpenUpload,
  onOpenCategories,
  onOpenStorage,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 space-y-2.5">
        
        {/* Top brand & actions bar */}
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight flex items-center gap-1.5 truncate">
                <span>万能解压与文档云盒</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-1.5 py-0.2 rounded border border-blue-500/30 hidden sm:inline">
                  ISO·ZIP·RAR·TAR
                </span>
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenCategories}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition hidden sm:flex items-center gap-1.5 text-xs font-medium"
              title="管理分类"
            >
              <Tags className="w-3.5 h-3.5 text-amber-400" />
              <span>分类管理</span>
            </button>

            <button
              onClick={onOpenStorage}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition hidden sm:flex items-center gap-1.5 text-xs font-medium"
              title="存储状态"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>持久化存储</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 active:scale-95 transition"
            >
              <Upload className="w-4 h-4" />
              <span>解压新文件</span>
            </button>
          </div>
        </div>

        {/* Search bar & Category filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索解压包名、文档名、代码或路径..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Horizontal scrollable category pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => onSelectCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              全部
            </button>

            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

        </div>

      </div>
    </header>
  );
};
