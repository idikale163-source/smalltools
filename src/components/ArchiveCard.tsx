import React from 'react';
import { 
  Disc, FolderArchive, FileArchive, Star, Trash2, 
  Download, ChevronRight, Folder, FileCode, FileText 
} from 'lucide-react';
import { ArchiveRecord, Category } from '../types';
import { formatBytes, formatDate } from '../utils/fileHelpers';

interface ArchiveCardProps {
  archive: ArchiveRecord;
  category?: Category;
  isSelected?: boolean;
  onSelect: () => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onBatchDownloadArchive: (archive: ArchiveRecord) => void;
}

export const ArchiveCard: React.FC<ArchiveCardProps> = ({
  archive,
  category,
  isSelected,
  onSelect,
  onToggleFavorite,
  onDelete,
  onBatchDownloadArchive,
}) => {
  const getFormatBadge = () => {
    switch (archive.format) {
      case 'iso':
        return {
          icon: <Disc className="w-5 h-5 text-purple-400" />,
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          label: 'ISO 镜像',
        };
      case 'zip':
        return {
          icon: <FolderArchive className="w-5 h-5 text-blue-400" />,
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
          label: 'ZIP 压缩包',
        };
      case 'rar':
        return {
          icon: <FileArchive className="w-5 h-5 text-amber-400" />,
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          label: 'RAR 压缩包',
        };
      case 'tar':
      case 'gz':
        return {
          icon: <FileCode className="w-5 h-5 text-cyan-400" />,
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          label: 'TAR.GZ 归档',
        };
      default:
        return {
          icon: <Folder className="w-5 h-5 text-slate-400" />,
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          label: '压缩归档',
        };
    }
  };

  const badge = getFormatBadge();

  return (
    <div
      onClick={onSelect}
      className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group ${
        isSelected
          ? 'bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/10'
          : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${badge.bg}`}>
            {badge.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-blue-400 transition truncate">
              {archive.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.bg}`}>
                {badge.label}
              </span>
              <span>{formatBytes(archive.size)}</span>
            </div>
          </div>
        </div>

        {/* Favorite */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleFavorite(archive.id);
          }}
          className={`p-1.5 rounded-lg transition ${
            archive.isFavorite
              ? 'text-amber-400 bg-amber-400/10'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title={archive.isFavorite ? '取消收藏' : '收藏'}
        >
          <Star className={`w-4 h-4 ${archive.isFavorite ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      {/* Middle stats & tags */}
      <div className="flex items-center justify-between text-xs text-slate-400 py-2 border-y border-slate-800/80 my-1">
        <div className="flex items-center gap-3">
          <span>{archive.fileCount} 个文件</span>
          {archive.directoryCount > 0 && <span>{archive.directoryCount} 个目录</span>}
        </div>
        
        {category && (
          <div className="flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} />
            <span>{category.name}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
        <span>{formatDate(archive.createdAt)}</span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onBatchDownloadArchive(archive);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="打包导出此压缩包全部文件"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete(archive.id);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="删除解压记录及文件"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="p-1 text-slate-500 group-hover:text-blue-400 transition">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
