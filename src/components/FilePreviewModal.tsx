import React, { useState, useEffect } from 'react';
import { 
  X, Download, Edit3, Eye, FileText, Image as ImageIcon, 
  Music, Video, FileCode, Binary, ZoomIn, ZoomOut, RotateCw, 
  Copy, Check, FileCheck
} from 'lucide-react';
import { ExtractedFile } from '../types';
import { formatBytes, formatDate, isTextFile, downloadBlob, textToArrayBuffer } from '../utils/fileHelpers';

interface FilePreviewModalProps {
  file: ExtractedFile | null;
  onClose: () => void;
  onEdit: (file: ExtractedFile) => void;
  onUpdateCategory?: (fileId: string, categoryId: string) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onEdit,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState<'preview' | 'hex' | 'raw'>('preview');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    setZoom(1);
    setRotation(0);
    setCopied(false);
    setPreviewTab('preview');

    if (file.content) {
      const blob = new Blob([file.content], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (file.textContent) {
      const blob = new Blob([file.textContent], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  if (!file) return null;

  const handleCopyText = () => {
    if (file.textContent) {
      navigator.clipboard.writeText(file.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (file.content) {
      const blob = new Blob([file.content], { type: file.mimeType });
      downloadBlob(blob, file.name);
    } else if (file.textContent) {
      const buffer = textToArrayBuffer(file.textContent);
      const blob = new Blob([buffer], { type: file.mimeType });
      downloadBlob(blob, file.name);
    }
  };

  // Hex viewer generator
  const renderHexView = () => {
    let bytes: Uint8Array;
    if (file.content instanceof Uint8Array) {
      bytes = file.content;
    } else if (file.content instanceof ArrayBuffer) {
      bytes = new Uint8Array(file.content);
    } else if (file.textContent) {
      bytes = new TextEncoder().encode(file.textContent);
    } else {
      bytes = new Uint8Array(0);
    }

    const previewLimit = Math.min(bytes.length, 1024 * 4); // First 4KB for performance
    const rows: { offset: string; hex: string; ascii: string }[] = [];

    for (let i = 0; i < previewLimit; i += 16) {
      const offset = i.toString(16).padStart(8, '0');
      let hex = '';
      let ascii = '';

      for (let j = 0; j < 16; j++) {
        if (i + j < previewLimit) {
          const byte = bytes[i + j];
          hex += byte.toString(16).padStart(2, '0') + ' ';
          ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
        } else {
          hex += '   ';
        }
      }

      rows.push({ offset, hex, ascii });
    }

    return (
      <div className="font-mono text-xs overflow-x-auto p-4 bg-slate-950 text-slate-300 rounded-xl space-y-1">
        <div className="text-slate-500 pb-2 border-b border-slate-800 flex justify-between">
          <span>Offset (h)  00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  Decoded Text</span>
          <span>{bytes.length > 4096 ? `显示前 4KB (共 ${formatBytes(bytes.length)})` : `全量 ${formatBytes(bytes.length)}`}</span>
        </div>
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-4 hover:bg-slate-900/60 py-0.5 px-1 rounded">
            <span className="text-amber-500 select-none">{row.offset}</span>
            <span className="text-cyan-400 select-all tracking-wider">{row.hex}</span>
            <span className="text-emerald-400 border-l border-slate-800 pl-3 select-all">{row.ascii}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    // Markdown / Code / Text
    if (isTextFile(file.fileType) && previewTab === 'preview') {
      const text = file.textContent || '';
      const lines = text.split('\n');

      return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50 text-xs text-slate-400">
            <span className="flex items-center gap-2 font-mono">
              <FileCode className="w-4 h-4 text-blue-400" />
              {lines.length} 行 · {text.length} 字符 · UTF-8
            </span>
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制文本'}</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
            {lines.map((line, index) => (
              <div key={index} className="flex hover:bg-slate-800/40 px-1 py-0.5 rounded">
                <span className="w-10 select-none text-slate-600 text-right pr-4 text-xs pt-0.5">{index + 1}</span>
                <span className="flex-1 break-all whitespace-pre-wrap text-slate-200">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Image
    if (file.fileType === 'image' && mediaUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[360px] bg-slate-950 rounded-xl p-4 overflow-hidden relative">
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="p-1 hover:text-blue-400 text-slate-300"
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="p-1 hover:text-blue-400 text-slate-300"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="p-1 hover:text-blue-400 text-slate-300"
              title="旋转"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 ml-1">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto w-full max-h-[60vh]">
            <img
              src={mediaUrl}
              alt={file.name}
              referrerPolicy="no-referrer"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
              className="max-h-[50vh] max-w-full object-contain shadow-2xl rounded-lg"
            />
          </div>
        </div>
      );
    }

    // Audio
    if (file.fileType === 'audio' && mediaUrl) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl border border-slate-800 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6 shadow-inner border border-amber-500/20">
            <Music className="w-10 h-10 animate-pulse" />
          </div>
          <h3 className="text-base font-semibold text-slate-100 mb-1 truncate max-w-xs">{file.name}</h3>
          <p className="text-xs text-slate-400 mb-6">{formatBytes(file.size)} · {file.mimeType}</p>
          <audio controls className="w-full max-w-md shadow-lg rounded-lg">
            <source src={mediaUrl} type={file.mimeType} />
            您的浏览器不支持音频播放
          </audio>
        </div>
      );
    }

    // Video
    if (file.fileType === 'video' && mediaUrl) {
      return (
        <div className="flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden border border-slate-800">
          <video controls className="w-full max-h-[55vh] rounded-lg">
            <source src={mediaUrl} type={file.mimeType} />
            您的浏览器不支持视频播放
          </video>
        </div>
      );
    }

    // PDF
    if (file.fileType === 'pdf' && mediaUrl) {
      return (
        <div className="w-full h-[65vh] bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
          <iframe src={mediaUrl} className="w-full h-full border-0" title={file.name} />
        </div>
      );
    }

    // Binary / Unknown / Hex tab
    return renderHexView();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="flex flex-col w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              {file.fileType === 'image' && <ImageIcon className="w-5 h-5 text-emerald-400" />}
              {file.fileType === 'markdown' && <FileText className="w-5 h-5 text-blue-400" />}
              {file.fileType === 'code' && <FileCode className="w-5 h-5 text-cyan-400" />}
              {file.fileType === 'audio' && <Music className="w-5 h-5 text-amber-400" />}
              {file.fileType === 'video' && <Video className="w-5 h-5 text-rose-400" />}
              {file.fileType === 'pdf' && <FileCheck className="w-5 h-5 text-red-400" />}
              {!['image', 'markdown', 'code', 'audio', 'video', 'pdf'].includes(file.fileType) && (
                <Binary className="w-5 h-5 text-purple-400" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-slate-100 truncate flex items-center gap-2">
                <span>{file.name}</span>
                {file.isEdited && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                    已在线编辑
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {file.path} · {formatBytes(file.size)} · {formatDate(file.lastModified)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {isTextFile(file.fileType) && (
              <button
                onClick={() => onEdit(file)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">在线编辑</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="下载文件"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switch for view mode (Preview vs Hex Inspector) */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreviewTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                previewTab === 'preview' 
                  ? 'bg-blue-600/20 text-blue-400 font-medium border border-blue-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>视图预览</span>
            </button>
            <button
              onClick={() => setPreviewTab('hex')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                previewTab === 'hex' 
                  ? 'bg-blue-600/20 text-blue-400 font-medium border border-blue-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>十六进制 (Hex) 检查</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            归属解压包: {file.archiveName}
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-3 sm:p-5 overflow-auto min-h-[300px] max-h-[calc(85vh-120px)] bg-slate-950/40">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
