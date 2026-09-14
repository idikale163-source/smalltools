import React from 'react';
import { Package, Files, Tags, Database, Plus } from 'lucide-react';

export type TabType = 'archives' | 'files' | 'categories' | 'storage';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenUpload: () => void;
  archiveCount: number;
  fileCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenUpload,
  archiveCount,
  fileCount,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe">
      <div className="flex items-center justify-around px-2 py-1.5 relative">
        
        {/* Archives Tab */}
        <button
          onClick={() => onChangeTab('archives')}
          className={`flex flex-col items-center justify-center w-16 py-1 text-[11px] font-medium transition ${
            activeTab === 'archives' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5" />
            {archiveCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[9px] px-1 rounded-full font-bold">
                {archiveCount}
              </span>
            )}
          </div>
          <span className="mt-0.5">压缩包</span>
        </button>

        {/* Files Tab */}
        <button
          onClick={() => onChangeTab('files')}
          className={`flex flex-col items-center justify-center w-16 py-1 text-[11px] font-medium transition ${
            activeTab === 'files' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Files className="w-5 h-5" />
            {fileCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] px-1 rounded-full font-bold">
                {fileCount}
              </span>
            )}
          </div>
          <span className="mt-0.5">文件库</span>
        </button>

        {/* Center Quick Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-400 text-white shadow-lg shadow-blue-500/40 active:scale-95 transition"
          title="解压新文件"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Categories Tab */}
        <button
          onClick={() => onChangeTab('categories')}
          className={`flex flex-col items-center justify-center w-16 py-1 text-[11px] font-medium transition ${
            activeTab === 'categories' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tags className="w-5 h-5" />
          <span className="mt-0.5">分类</span>
        </button>

        {/* Storage Tab */}
        <button
          onClick={() => onChangeTab('storage')}
          className={`flex flex-col items-center justify-center w-16 py-1 text-[11px] font-medium transition ${
            activeTab === 'storage' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-5 h-5" />
          <span className="mt-0.5">存储</span>
        </button>

      </div>
    </div>
  );
};
