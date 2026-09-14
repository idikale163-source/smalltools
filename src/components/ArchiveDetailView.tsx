import React, { useState } from 'react';
import { 
  ArrowLeft, Download, Plus, Search, Folder, 
  ChevronRight, Disc, FolderArchive, FileArchive, 
  FileCode, Star, Trash2, Edit2, FilePlus, Filter
} from 'lucide-react';
import { ArchiveRecord, ExtractedFile, Category } from '../types';
import { FileItem } from './FileItem';
import { formatBytes, formatDate } from '../utils/fileHelpers';

interface ArchiveDetailViewProps {
  archive: ArchiveRecord;
  files: ExtractedFile[];
  categories: Category[];
  selectedFileIds: Set<string>;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onDeleteArchive: (id: string) => void;
  onToggleSelectFile: (fileId: string) => void;
  onPreviewFile: (file: ExtractedFile) => void;
  onEditFile: (file: ExtractedFile) => void;
  onDownloadFile: (file: ExtractedFile) => void;
  onDeleteFile: (fileId: string) => void;
  onBatchDownloadArchive: (archive: ArchiveRecord) => void;
  onCreateNewFile: (archiveId: string, currentPath: string) => void;
}

export const ArchiveDetailView: React.FC<ArchiveDetailViewProps> = ({
  archive,
  files,
  categories,
  selectedFileIds,
  onBack,
  onToggleFavorite,
  onDeleteArchive,
  onToggleSelectFile,
  onPreviewFile,
  onEditFile,
  onDownloadFile,
  onDeleteFile,
  onBatchDownloadArchive,
  onCreateNewFile,
}) => {
  const [currentFolder, setCurrentFolder] = useState<string>(''); // '' = root
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Filter files in this archive
  const archiveFiles = files.filter(f => f.archiveId === archive.id);

  // Filter by search & file type
  const searchedFiles = archiveFiles.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || f.fileType === filterType;
    return matchSearch && matchType;
  });

  // Calculate current folder items or flattened search view
  const isSearching = searchQuery.trim().length > 0 || filterType !== 'all';

  // Folders and files in current folder level
  const displayedItems = isSearching
    ? searchedFiles
    : archiveFiles.filter(f => {
        if (currentFolder === '') {
          // root level: no slash in path
          return !f.path.includes('/');
        } else {
          // inside currentFolder: path starts with currentFolder + '/' and has no further slash
          const prefix = `${currentFolder}/`;
          if (!f.path.startsWith(prefix)) return false;
          const relative = f.path.substring(prefix.length);
          return !relative.includes('/');
        }
      });

  // Unique subfolders in current folder
  const subfolders: string[] = [];
  if (!isSearching) {
    archiveFiles.forEach(f => {
      let relPath = f.path;
      if (currentFolder) {
        if (f.path.startsWith(`${currentFolder}/`)) {
          relPath = f.path.substring(currentFolder.length + 1);
        } else {
          return;
        }
      }
      const parts = relPath.split('/');
      if (parts.length > 1) {
        const nextFolder = parts[0];
        const fullNextFolderPath = currentFolder ? `${currentFolder}/${nextFolder}` : nextFolder;
        if (!subfolders.includes(fullNextFolderPath)) {
          subfolders.push(fullNextFolderPath);
        }
      }
    });
  }

  const category = categories.find(c => c.id === archive.categoryId);

  // Breadcrumb path segments
  const pathSegments = currentFolder ? currentFolder.split('/') : [];

  const handleOpenFolder = (folderPath: string) => {
    setCurrentFolder(folderPath);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolder('');
    } else {
      const newPath = pathSegments.slice(0, index + 1).join('/');
      setCurrentFolder(newPath);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-24 sm:pb-12">
      
      {/* Archive Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
              title="返回压缩包列表"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold text-slate-100 truncate">
                  {archive.name}
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                  {archive.format.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatBytes(archive.size)} · {archive.fileCount} 个文件 · 解压于 {formatDate(archive.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onToggleFavorite(archive.id)}
              className={`p-2 rounded-xl border transition ${
                archive.isFavorite
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="收藏"
            >
              <Star className={`w-4 h-4 ${archive.isFavorite ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => onCreateNewFile(archive.id, currentFolder)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="在此目录下新建文档"
            >
              <FilePlus className="w-4 h-4 text-emerald-400" />
              <span>新建文档</span>
            </button>

            <button
              onClick={() => onBatchDownloadArchive(archive)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
              title="导出全包为 ZIP"
            >
              <Download className="w-4 h-4" />
              <span>打包下载全包</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 overflow-x-auto py-2 px-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
          <button
            onClick={() => handleNavigateBreadcrumb(-1)}
            className={`flex items-center gap-1 hover:text-blue-400 transition font-medium ${
              currentFolder === '' ? 'text-blue-400' : 'text-slate-400'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>根目录</span>
          </button>

          {pathSegments.map((segment, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <button
                onClick={() => handleNavigateBreadcrumb(idx)}
                className={`hover:text-blue-400 transition font-medium truncate max-w-[120px] ${
                  idx === pathSegments.length - 1 ? 'text-blue-400' : 'text-slate-400'
                }`}
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Search & Filter within Archive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="在当前压缩包内搜索文件..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['all', 'markdown', 'text', 'code', 'image', 'audio', 'video'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'all' && '全部类型'}
              {type === 'markdown' && 'Markdown'}
              {type === 'text' && '文档文本'}
              {type === 'code' && '代码'}
              {type === 'image' && '图片'}
              {type === 'audio' && '音频'}
              {type === 'video' && '视频'}
            </button>
          ))}
        </div>
      </div>

      {/* Subfolder list if any */}
      {!isSearching && subfolders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {subfolders.map(folderPath => {
            const folderName = folderPath.split('/').pop() || folderPath;
            const itemsInside = archiveFiles.filter(f => f.path.startsWith(`${folderPath}/`)).length;

            return (
              <div
                key={folderPath}
                onClick={() => handleOpenFolder(folderPath)}
                className="flex items-center gap-2.5 p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <Folder className="w-4 h-4 fill-amber-400/20" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 truncate">
                    {folderName}
                  </div>
                  <div className="text-[10px] text-slate-400">{itemsInside} 项</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>文件列表 ({displayedItems.length})</span>
          {isSearching && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="text-blue-400 hover:underline"
            >
              清除搜索筛选
            </button>
          )}
        </div>

        {displayedItems.length === 0 && subfolders.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            当前目录下无文件
          </div>
        ) : (
          displayedItems.map(file => (
            <FileItem
              key={file.id}
              file={file}
              categories={categories}
              isSelected={selectedFileIds.has(file.id)}
              onToggleSelect={onToggleSelectFile}
              onPreview={onPreviewFile}
              onEdit={onEditFile}
              onDownload={onDownloadFile}
              onDelete={onDeleteFile}
              onOpenFolder={handleOpenFolder}
            />
          ))
        )}
      </div>

    </div>
  );
};
