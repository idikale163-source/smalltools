import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, Disc, FileArchive, FolderArchive, 
  Sparkles, CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { extractArchive, ExtractionProgress } from '../utils/archiveExtractor';
import { createSampleIsoBuffer, createSampleZipBlob, createSampleRarBlob } from '../utils/sampleArchives';
import { ArchiveRecord, ExtractedFile } from '../types';

interface UploadModalProps {
  onClose: () => void;
  onExtracted: (archive: ArchiveRecord, files: ExtractedFile[]) => Promise<void>;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onExtracted,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const processFile = async (file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer>; size: number }) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProgress({ percent: 10, message: '准备解压...' });

    try {
      const result = await extractArchive(file, p => {
        setProgress(p);
      });

      triggerConfetti();
      await onExtracted(result.archive, result.files);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Extraction failed', err);
      setErrorMsg(err?.message || '解压解析失败，请检查文件是否损坏或受密码保护。');
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Sample Archive Handlers
  const handleLoadSampleIso = async () => {
    const buffer = createSampleIsoBuffer();
    const fakeFile = {
      name: 'Linux_Rescue_LiveCD_2026.iso',
      size: buffer.byteLength,
      arrayBuffer: async () => buffer,
    };
    await processFile(fakeFile);
  };

  const handleLoadSampleZip = async () => {
    const blob = await createSampleZipBlob();
    const buffer = await blob.arrayBuffer();
    const fakeFile = {
      name: 'Fullstack_Project_Demo.zip',
      size: blob.size,
      arrayBuffer: async () => buffer,
    };
    await processFile(fakeFile);
  };

  const handleLoadSampleRar = async () => {
    const blob = createSampleRarBlob();
    const buffer = await blob.arrayBuffer();
    const fakeFile = {
      name: 'UI_Design_Assets.rar',
      size: blob.size,
      arrayBuffer: async () => buffer,
    };
    await processFile(fakeFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="flex flex-col w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">上传并解压压缩包 / 镜像</h2>
              <p className="text-xs text-slate-400">支持 ISO、ZIP、RAR、TAR、GZ、7Z 等</p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept=".zip,.rar,.iso,.img,.tar,.gz,.tgz,.7z"
          />

          {/* Drag and Drop Zone */}
          {!isProcessing ? (
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition text-center ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
                  : 'border-slate-700 hover:border-blue-500/60 bg-slate-950/50 hover:bg-slate-950/80'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 border border-blue-500/20 shadow-inner">
                <UploadCloud className="w-7 h-7 animate-bounce" />
              </div>

              <p className="text-sm font-semibold text-slate-200 mb-1">
                点击选择文件 或 拖放文件至此处
              </p>
              <p className="text-xs text-slate-400 mb-3">
                支持 .iso · .zip · .rar · .tar.gz · .7z 等各种文件夹镜像
              </p>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>浏览器纯本地极速解压 · 数据不离开您的设备</span>
              </div>
            </div>
          ) : (
            /* Progress State */
            <div className="flex flex-col items-center justify-center p-8 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
              </div>

              <div className="space-y-1 w-full max-w-sm">
                <div className="flex justify-between text-xs font-semibold text-slate-200">
                  <span>{progress?.message || '正在解包解析...'}</span>
                  <span>{progress?.percent || 0}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress?.percent || 0}%` }}
                  />
                </div>
                {progress?.currentFile && (
                  <p className="text-[11px] text-slate-400 truncate max-w-xs mx-auto">
                    {progress.currentFile}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* One-click Demo Archives for Quick Mobile Testing */}
          {!isProcessing && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  一键快速测试（免手机下载）:
                </span>
                <span className="text-[11px] text-slate-500">内置标准测试包</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleIso}
                  className="flex items-center gap-2 p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-purple-500/20 hover:border-purple-500/50 rounded-xl transition text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                    <Disc className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 truncate">
                      Linux 镜像 (.ISO)
                    </div>
                    <div className="text-[10px] text-slate-400">Joliet 扇区解析</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleZip}
                  className="flex items-center gap-2 p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-blue-500/20 hover:border-blue-500/50 rounded-xl transition text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 truncate">
                      全栈工程 (.ZIP)
                    </div>
                    <div className="text-[10px] text-slate-400">含文档与源码</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleRar}
                  className="flex items-center gap-2 p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-amber-500/20 hover:border-amber-500/50 rounded-xl transition text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <FileArchive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 truncate">
                      设计资源 (.RAR)
                    </div>
                    <div className="text-[10px] text-slate-400">RAR4 分卷规范</div>
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
