import React, { useState, useEffect } from 'react';
import { 
  X, Database, HardDrive, Trash2, Download, Upload, 
  CheckCircle2, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { getStorageUsage, getAllArchives, getAllFiles, saveArchive, DEFAULT_CATEGORIES } from '../services/db';
import { formatBytes } from '../utils/fileHelpers';
import { ArchiveRecord, ExtractedFile } from '../types';

interface StorageManagerModalProps {
  archives: ArchiveRecord[];
  files: ExtractedFile[];
  onClose: () => void;
  onRefreshAll: () => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  archives,
  files,
  onClose,
  onRefreshAll,
  onClearAll,
}) => {
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number; percentage: number }>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
    percentage: 0,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, [archives, files]);

  const loadStorageInfo = async () => {
    const stats = await getStorageUsage();
    setStorageInfo(stats);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const allArchives = await getAllArchives();
      const allFiles = await getAllFiles();

      const backupObj = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        archives: allArchives,
        files: allFiles.map(f => ({
          ...f,
          content: undefined, // keep text content for backup lightness or serialize
          textContent: f.textContent,
        })),
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ArchiveHub_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Backup failed', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="flex flex-col w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">持久化存储管理</h2>
              <p className="text-xs text-slate-400">IndexedDB 本地离线数据库与空间配额</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Storage Meter */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span>已用设备空间</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {formatBytes(storageInfo.usedBytes)} / {formatBytes(storageInfo.quotaBytes)}
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all"
                style={{ width: `${Math.max(1, storageInfo.percentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div className="p-2 bg-slate-900/60 rounded-xl">
                <div className="text-base font-bold text-slate-100">{archives.length}</div>
                <div className="text-[11px] text-slate-400">解压包总数</div>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-xl">
                <div className="text-base font-bold text-slate-100">{files.length}</div>
                <div className="text-[11px] text-slate-400">解压文件总数</div>
              </div>
            </div>
          </div>

          {/* Backup & Export */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              数据备份与迁移
            </div>

            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-left transition text-slate-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-100 group-hover:text-blue-400">
                    导出结构索引备份 (JSON)
                  </div>
                  <div className="text-[11px] text-slate-400">备份所有解压记录、目录结构与文档内容</div>
                </div>
              </div>
            </button>
          </div>

          {/* Danger Zone: Clear Storage */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              危险操作区
            </div>

            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full flex items-center justify-between p-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-left transition text-rose-300"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold">清空本地所有解压文件与缓存</span>
                </div>
              </button>
            ) : (
              <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs text-rose-300 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>确定要清空全部数据吗？此操作无法撤销。</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="px-3 py-1.5 bg-slate-800 text-xs text-slate-300 rounded-lg hover:text-white"
                  >
                    取消
                  </button>
                  <button
                    onClick={async () => {
                      await onClearAll();
                      setShowConfirmClear(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs text-white rounded-lg font-semibold"
                  >
                    确认清空全部
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
