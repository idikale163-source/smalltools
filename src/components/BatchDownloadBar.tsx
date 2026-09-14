import React, { useState } from 'react';
import { Download, Trash2, FolderInput, CheckSquare, Square, X, Loader2 } from 'lucide-react';
import { Category } from '../types';

interface BatchDownloadBarProps {
  selectedCount: number;
  totalCount: number;
  categories: Category[];
  isDownloading?: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchDownloadZip: () => Promise<void>;
  onBatchDelete: () => Promise<void>;
  onBatchChangeCategory: (categoryId: string) => Promise<void>;
}

export const BatchDownloadBar: React.FC<BatchDownloadBarProps> = ({
  selectedCount,
  totalCount,
  categories,
  isDownloading,
  onSelectAll,
  onClearSelection,
  onBatchDownloadZip,
  onBatchDelete,
  onBatchChangeCategory,
}) => {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-slate-900/95 backdrop-blur-md border border-blue-500/40 rounded-2xl shadow-2xl p-3 sm:p-4 text-slate-100 flex flex-wrap items-center justify-between gap-3 animate-slideUp">
      
      {/* Left: Info & select all */}
      <div className="flex items-center gap-3">
        <button
          onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          {selectedCount === totalCount ? (
            <CheckSquare className="w-4 h-4 text-blue-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span>{selectedCount === totalCount ? '取消全选' : '全选'}</span>
        </button>

        <div className="text-xs text-slate-300">
          已选 <span className="font-semibold text-blue-400">{selectedCount}</span> / {totalCount} 项
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-wrap relative">
        
        {/* Change Category Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryMenu(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <FolderInput className="w-3.5 h-3.5 text-amber-400" />
            <span>分类归档</span>
          </button>

          {showCategoryMenu && (
            <div className="absolute bottom-full mb-2 right-0 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-1.5 z-50 space-y-1">
              <div className="text-[10px] text-slate-400 px-2 py-1 uppercase font-semibold">选择目标分类</div>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onBatchChangeCategory(cat.id);
                    setShowCategoryMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 text-left transition"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Batch Delete */}
        <button
          onClick={onBatchDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 transition"
          title="批量删除所选文件"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">批量删除</span>
        </button>

        {/* Batch Download ZIP */}
        <button
          onClick={onBatchDownloadZip}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{isDownloading ? '打包中...' : '打包 ZIP 下载'}</span>
        </button>

        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="取消所有选择"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
