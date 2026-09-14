import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Files, Tags, Database, Plus, Upload, 
  Search, Filter, Sparkles, FolderArchive, Disc, 
  FileArchive, Download, Trash2, ArrowUpDown, RefreshCw 
} from 'lucide-react';
import { ArchiveRecord, ExtractedFile, Category } from './types';
import { 
  getAllArchives, getAllFiles, getAllCategories, saveArchive, 
  deleteArchive, updateArchive, updateFile, deleteFile, 
  batchDeleteFiles, batchUpdateCategory, saveCategory, 
  deleteCategory, getDB 
} from './services/db';
import { createZipBundle, extractArchive } from './utils/archiveExtractor';
import { createSampleIsoBuffer, createSampleZipBlob, createSampleRarBlob } from './utils/sampleArchives';
import { downloadBlob, formatBytes } from './utils/fileHelpers';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { ArchiveCard } from './components/ArchiveCard';
import { ArchiveDetailView } from './components/ArchiveDetailView';
import { FileItem } from './components/FileItem';
import { FilePreviewModal } from './components/FilePreviewModal';
import { DocumentEditorModal } from './components/DocumentEditorModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { StorageManagerModal } from './components/StorageManagerModal';
import { UploadModal } from './components/UploadModal';
import { BatchDownloadBar } from './components/BatchDownloadBar';

export default function App() {
  // Main Data States
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<TabType>('archives');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'size'>('newest');

  // Multi-Selection State
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [previewingFile, setPreviewingFile] = useState<ExtractedFile | null>(null);
  const [editingFile, setEditingFile] = useState<ExtractedFile | null>(null);

  // Initialize and load from IndexedDB
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      await getDB();
      const loadedCategories = await getAllCategories();
      setCategories(loadedCategories);

      const loadedArchives = await getAllArchives();
      const loadedFiles = await getAllFiles();

      if (loadedArchives.length === 0) {
        // Seed default rich demonstration archives: Linux Rescue ISO + Fullstack Project ZIP
        await seedInitialData();
      } else {
        setArchives(loadedArchives);
        setFiles(loadedFiles);
      }
    } catch (e) {
      console.error('Database initialization error', e);
    } finally {
      setLoading(false);
    }
  };

  const seedInitialData = async () => {
    try {
      // 1. Seed sample ISO archive
      const isoBuffer = createSampleIsoBuffer();
      const isoResult = await extractArchive({
        name: 'Ubuntu_Rescue_Minimal_2026.iso',
        size: isoBuffer.byteLength,
        arrayBuffer: async () => isoBuffer,
      });
      await saveArchive(isoResult.archive, isoResult.files);

      // 2. Seed sample ZIP archive
      const zipBlob = await createSampleZipBlob();
      const zipBuffer = await zipBlob.arrayBuffer();
      const zipResult = await extractArchive({
        name: 'Fullstack_TypeScript_Project.zip',
        size: zipBlob.size,
        arrayBuffer: async () => zipBuffer,
      });
      await saveArchive(zipResult.archive, zipResult.files);

      // Reload
      const freshArchives = await getAllArchives();
      const freshFiles = await getAllFiles();
      setArchives(freshArchives);
      setFiles(freshFiles);
    } catch (e) {
      console.error('Error seeding demo data', e);
    }
  };

  const reloadData = async () => {
    const loadedArchives = await getAllArchives();
    const loadedFiles = await getAllFiles();
    const loadedCategories = await getAllCategories();
    setArchives(loadedArchives);
    setFiles(loadedFiles);
    setCategories(loadedCategories);
  };

  // Archive & File Handlers
  const handleExtracted = async (archive: ArchiveRecord, newFiles: ExtractedFile[]) => {
    await saveArchive(archive, newFiles);
    await reloadData();
    setSelectedArchiveId(archive.id);
  };

  const handleToggleFavorite = async (archiveId: string) => {
    const arch = archives.find(a => a.id === archiveId);
    if (arch) {
      const updated = { ...arch, isFavorite: !arch.isFavorite };
      await updateArchive(updated);
      setArchives(archives.map(a => a.id === archiveId ? updated : a));
    }
  };

  const handleDeleteArchive = async (archiveId: string) => {
    if (window.confirm('确定要删除此压缩包及其所有解压文件吗？')) {
      await deleteArchive(archiveId);
      if (selectedArchiveId === archiveId) {
        setSelectedArchiveId(null);
      }
      await reloadData();
    }
  };

  const handleSaveEditedFile = async (updatedFile: ExtractedFile) => {
    await updateFile(updatedFile);
    await reloadData();
    if (previewingFile?.id === updatedFile.id) {
      setPreviewingFile(updatedFile);
    }
    setEditingFile(null);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (window.confirm('确定要删除此文件吗？')) {
      await deleteFile(fileId);
      selectedFileIds.delete(fileId);
      setSelectedFileIds(new Set(selectedFileIds));
      await reloadData();
    }
  };

  const handleCreateNewFile = (archiveId: string, currentPath: string) => {
    const newFileName = `新建文档_${Date.now().toString().slice(-4)}.md`;
    const fullPath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
    const arch = archives.find(a => a.id === archiveId);

    const newDoc: ExtractedFile = {
      id: `file-${archiveId}-new-${Date.now()}`,
      archiveId,
      archiveName: arch?.originalFileName || '新压缩包',
      path: fullPath,
      name: newFileName,
      extension: 'md',
      size: 0,
      mimeType: 'text/markdown',
      fileType: 'markdown',
      isDirectory: false,
      textContent: '# 新建文档\n\n在此开始撰写您的文档内容...\n',
      lastModified: Date.now(),
      categoryId: 'cat-docs',
      isEdited: true,
    };

    setEditingFile(newDoc);
  };

  // Selection & Batch Operations
  const handleToggleSelectFile = (fileId: string) => {
    const next = new Set(selectedFileIds);
    if (next.has(fileId)) {
      next.delete(fileId);
    } else {
      next.add(fileId);
    }
    setSelectedFileIds(next);
  };

  const handleSelectAll = (fileList: ExtractedFile[]) => {
    const validIds = fileList.filter(f => !f.isDirectory).map(f => f.id);
    setSelectedFileIds(new Set(validIds));
  };

  const handleClearSelection = () => {
    setSelectedFileIds(new Set());
  };

  const handleBatchDownloadZip = async () => {
    if (selectedFileIds.size === 0) return;
    setIsBatchDownloading(true);
    try {
      const selectedFiles = files.filter(f => selectedFileIds.has(f.id));
      const zipBlob = await createZipBundle(selectedFiles, 'Batch_Export.zip');
      downloadBlob(zipBlob, `Batch_Selected_Files_${Date.now().toString().slice(-4)}.zip`);
    } catch (e) {
      console.error('Batch download failed', e);
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const handleBatchDownloadArchive = async (archive: ArchiveRecord) => {
    setIsBatchDownloading(true);
    try {
      const archFiles = files.filter(f => f.archiveId === archive.id);
      const zipBlob = await createZipBundle(archFiles, `${archive.name}_Full_Export.zip`);
      downloadBlob(zipBlob, `${archive.name}_Export.zip`);
    } catch (e) {
      console.error('Archive download failed', e);
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`确定要删除选中的 ${selectedFileIds.size} 个文件吗？`)) {
      await batchDeleteFiles(Array.from(selectedFileIds));
      setSelectedFileIds(new Set());
      await reloadData();
    }
  };

  const handleBatchChangeCategory = async (categoryId: string) => {
    await batchUpdateCategory(Array.from(selectedFileIds), categoryId);
    setSelectedFileIds(new Set());
    await reloadData();
  };

  const handleClearAllStorage = async () => {
    for (const a of archives) {
      await deleteArchive(a.id);
    }
    setSelectedFileIds(new Set());
    setSelectedArchiveId(null);
    await reloadData();
  };

  // Filtered Archives & Files
  const filteredArchives = useMemo(() => {
    return archives.filter(a => {
      const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.originalFileName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || a.categoryId === selectedCategory;
      return matchSearch && matchCat;
    }).sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.size - a.size;
      return b.createdAt - a.createdAt;
    });
  }, [archives, searchQuery, selectedCategory, sortBy]);

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      if (f.isDirectory) return false;
      const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (f.textContent && f.textContent.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'all' || f.categoryId === selectedCategory;
      return matchSearch && matchCat;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.size - a.size;
      return b.lastModified - a.lastModified;
    });
  }, [files, searchQuery, selectedCategory, sortBy]);

  const selectedArchive = archives.find(a => a.id === selectedArchiveId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categories={categories}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenCategories={() => setShowCategoryModal(true)}
        onOpenStorage={() => setShowStorageModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        
        {/* Desktop View Switcher Header */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('archives');
                setSelectedArchiveId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'archives' && !selectedArchiveId
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>压缩包管理 ({archives.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('files');
                setSelectedArchiveId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'files'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Files className="w-4 h-4" />
              <span>全部解压文件 ({files.filter(f => !f.isDirectory).length})</span>
            </button>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>排序:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value="newest">最新添加</option>
              <option value="name">名称排序</option>
              <option value="size">大小排序</option>
            </select>
          </div>
        </div>

        {/* Dynamic Content Views */}
        {selectedArchive ? (
          /* Archive Detail & File Explorer */
          <ArchiveDetailView
            archive={selectedArchive}
            files={files}
            categories={categories}
            selectedFileIds={selectedFileIds}
            onBack={() => setSelectedArchiveId(null)}
            onToggleFavorite={handleToggleFavorite}
            onDeleteArchive={handleDeleteArchive}
            onToggleSelectFile={handleToggleSelectFile}
            onPreviewFile={setPreviewingFile}
            onEditFile={setEditingFile}
            onDownloadFile={file => {
              if (file.content) {
                downloadBlob(new Blob([file.content], { type: file.mimeType }), file.name);
              } else if (file.textContent) {
                downloadBlob(new Blob([file.textContent], { type: file.mimeType }), file.name);
              }
            }}
            onDeleteFile={handleDeleteFile}
            onBatchDownloadArchive={handleBatchDownloadArchive}
            onCreateNewFile={handleCreateNewFile}
          />
        ) : activeTab === 'archives' ? (
          /* Archive Cards Grid */
          <div className="space-y-4 pb-24 sm:pb-8">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>已解压压缩包 ({filteredArchives.length})</span>
              <span>支持在线预览、编辑、批量打包</span>
            </div>

            {filteredArchives.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-3xl border border-slate-800/80 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Package className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-200">暂无匹配的解压文件包</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    点击右上角“解压新文件”上传 ISO、ZIP、RAR 压缩包，或选择预设体验包
                  </p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
                >
                  立即上传解压
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredArchives.map(archive => (
                  <ArchiveCard
                    key={archive.id}
                    archive={archive}
                    category={categories.find(c => c.id === archive.categoryId)}
                    isSelected={selectedArchiveId === archive.id}
                    onSelect={() => setSelectedArchiveId(archive.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onDelete={handleDeleteArchive}
                    onBatchDownloadArchive={handleBatchDownloadArchive}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'files' ? (
          /* All Flat Files Library View */
          <div className="space-y-3 pb-24 sm:pb-8">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>所有解压文件 ({filteredFiles.length})</span>
              <button
                onClick={() => handleSelectAll(filteredFiles)}
                className="text-blue-400 hover:underline"
              >
                全选本页文件
              </button>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="p-10 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
                暂无符合筛选条件的文件
              </div>
            ) : (
              filteredFiles.map(file => (
                <FileItem
                  key={file.id}
                  file={file}
                  categories={categories}
                  isSelected={selectedFileIds.has(file.id)}
                  onToggleSelect={handleToggleSelectFile}
                  onPreview={setPreviewingFile}
                  onEdit={setEditingFile}
                  onDownload={f => {
                    if (f.content) {
                      downloadBlob(new Blob([f.content], { type: f.mimeType }), f.name);
                    } else if (f.textContent) {
                      downloadBlob(new Blob([f.textContent], { type: f.mimeType }), f.name);
                    }
                  }}
                  onDelete={handleDeleteFile}
                />
              ))
            )}
          </div>
        ) : activeTab === 'categories' ? (
          /* Mobile Categories View */
          <div className="space-y-4 pb-24 sm:pb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">分类标签</h2>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="text-xs text-blue-400 font-medium"
              >
                + 添加分类
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map(cat => {
                const count = files.filter(f => f.categoryId === cat.id && !f.isDirectory).length;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setActiveTab('files');
                    }}
                    className="flex items-center justify-between p-4 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-slate-700 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Tags className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">{cat.name}</h3>
                        <p className="text-xs text-slate-400">{cat.description || '自定义分类'}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-semibold">
                      {count} 个文件
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Mobile Storage View */
          <div className="space-y-4 pb-24 sm:pb-8">
            <StorageManagerModal
              archives={archives}
              files={files}
              onClose={() => setActiveTab('archives')}
              onRefreshAll={reloadData}
              onClearAll={handleClearAllStorage}
            />
          </div>
        )}

      </main>

      {/* Floating Batch Download & Action Bar */}
      <BatchDownloadBar
        selectedCount={selectedFileIds.size}
        totalCount={files.filter(f => !f.isDirectory).length}
        categories={categories}
        isDownloading={isBatchDownloading}
        onSelectAll={() => handleSelectAll(files)}
        onClearSelection={handleClearSelection}
        onBatchDownloadZip={handleBatchDownloadZip}
        onBatchDelete={handleBatchDelete}
        onBatchChangeCategory={handleBatchChangeCategory}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={tab => {
          setActiveTab(tab);
          setSelectedArchiveId(null);
        }}
        onOpenUpload={() => setShowUploadModal(true)}
        archiveCount={archives.length}
        fileCount={files.filter(f => !f.isDirectory).length}
      />

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onExtracted={handleExtracted}
        />
      )}

      {previewingFile && (
        <FilePreviewModal
          file={previewingFile}
          onClose={() => setPreviewingFile(null)}
          onEdit={f => {
            setPreviewingFile(null);
            setEditingFile(f);
          }}
        />
      )}

      {editingFile && (
        <DocumentEditorModal
          file={editingFile}
          categories={categories}
          onClose={() => setEditingFile(null)}
          onSave={handleSaveEditedFile}
        />
      )}

      {showCategoryModal && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onSaveCategory={async cat => {
            await saveCategory(cat);
            await reloadData();
          }}
          onDeleteCategory={async catId => {
            await deleteCategory(catId);
            await reloadData();
          }}
        />
      )}

      {showStorageModal && (
        <StorageManagerModal
          archives={archives}
          files={files}
          onClose={() => setShowStorageModal(false)}
          onRefreshAll={reloadData}
          onClearAll={handleClearAllStorage}
        />
      )}

    </div>
  );
}
