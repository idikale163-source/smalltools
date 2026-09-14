import React from 'react';
import { 
  Folder, FileText, Image as ImageIcon, Music, Video, 
  FileCode, Binary, Eye, Edit3, Download, Trash2, CheckSquare, Square, 
  FileCheck
} from 'lucide-react';
import { ExtractedFile, Category } from '../types';
import { formatBytes, formatDate, isTextFile } from '../utils/fileHelpers';

interface FileItemProps {
  file: ExtractedFile;
  categories: Category[];
  isSelected: boolean;
  onToggleSelect: (fileId: string) => void;
  onPreview: (file: ExtractedFile) => void;
  onEdit: (file: ExtractedFile) => void;
  onDownload: (file: ExtractedFile) => void;
  onDelete: (fileId: string) => void;
  onOpenFolder?: (folderPath: string) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  categories,
  isSelected,
  onToggleSelect,
  onPreview,
  onEdit,
  onDownload,
  onDelete,
  onOpenFolder,
}) => {
  const getFileIcon = () => {
    if (file.isDirectory) {
      return <Folder className="w-5 h-5 text-amber-400" />;
    }
    switch (file.fileType) {
      case 'markdown':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'text':
        return <FileText className="w-5 h-5 text-slate-300" />;
      case 'code':
        return <FileCode className="w-5 h-5 text-cyan-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-amber-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-rose-400" />;
      case 'pdf':
        return <FileCheck className="w-5 h-5 text-red-400" />;
      default:
        return <Binary className="w-5 h-5 text-purple-400" />;
    }
  };

  const category = categories.find(c => c.id === file.categoryId);

  const handleClickItem = () => {
    if (file.isDirectory && onOpenFolder) {
      onOpenFolder(file.path);
    } else {
      onPreview(file);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between p-3 rounded-xl border transition ${
        isSelected
          ? 'bg-blue-950/40 border-blue-500/60 shadow-sm'
          : 'bg-slate-900/60 hover:bg-slate-800/70 border-slate-800 hover:border-slate-700/80'
      }`}
    >
      {/* Left: Checkbox & Icon & Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={handleClickItem}>
        {/* Checkbox (only for files, not directories) */}
        {!file.isDirectory && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggleSelect(file.id);
            }}
            className="p-1 text-slate-400 hover:text-blue-400 transition"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
            )}
          </button>
        )}

        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
          {getFileIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-100 truncate group-hover:text-blue-400 transition">
              {file.name}
            </span>
            {file.isEdited && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 shrink-0">
                已编辑
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
            {!file.isDirectory && <span>{formatBytes(file.size)}</span>}
            <span>·</span>
            <span className="truncate">{file.path}</span>
            {category && (
              <>
                <span>·</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300" style={{ borderLeft: `3px solid ${category.color}` }}>
                  {category.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {!file.isDirectory && (
          <>
            <button
              type="button"
              onClick={() => onPreview(file)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="预览"
            >
              <Eye className="w-4 h-4" />
            </button>

            {isTextFile(file.fileType) && (
              <button
                type="button"
                onClick={() => onEdit(file)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-blue-600/30 text-slate-400 hover:text-blue-300 transition"
                title="在线编辑"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onDownload(file)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="下载"
            >
              <Download className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onDelete(file.id)}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
