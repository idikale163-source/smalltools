import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, Download, Undo, Redo, Search, 
  Bold, Italic, Heading1, Heading2, List, ListOrdered, 
  CheckSquare, Code, Table, Clock, Eye, EyeOff, FileText, Check
} from 'lucide-react';
import { ExtractedFile, Category } from '../types';
import { textToArrayBuffer, downloadBlob } from '../utils/fileHelpers';

interface DocumentEditorModalProps {
  file: ExtractedFile;
  categories: Category[];
  onClose: () => void;
  onSave: (updatedFile: ExtractedFile) => Promise<void>;
}

export const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  file,
  categories,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState(file.textContent || '');
  const [fileName, setFileName] = useState(file.name);
  const [selectedCategory, setSelectedCategory] = useState(file.categoryId || 'cat-docs');
  const [notes, setNotes] = useState(file.notes || '');
  
  // View states
  const [showPreview, setShowPreview] = useState(file.fileType === 'markdown');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  
  // History states for undo/redo
  const [history, setHistory] = useState<string[]>([file.textContent || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial content
  useEffect(() => {
    setContent(file.textContent || '');
    setFileName(file.name);
    setSelectedCategory(file.categoryId || 'cat-docs');
    setNotes(file.notes || '');
  }, [file]);

  const handleContentChange = (newText: string) => {
    setContent(newText);
    // Push history (debounced or trimmed to 30 states)
    if (newText !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newText);
      if (newHistory.length > 40) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      setContent(history[prev]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setContent(history[next]);
    }
  };

  // Insert markdown helper at cursor
  const insertText = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || '内容'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    handleContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 2));
    }, 10);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newBuffer = textToArrayBuffer(content);
      const updated: ExtractedFile = {
        ...file,
        name: fileName.trim() || file.name,
        textContent: content,
        content: newBuffer,
        size: newBuffer.byteLength,
        categoryId: selectedCategory,
        notes: notes,
        isEdited: true,
        lastModified: Date.now(),
      };

      await onSave(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Error saving document', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadDirect = () => {
    const buffer = textToArrayBuffer(content);
    const blob = new Blob([buffer], { type: file.mimeType });
    downloadBlob(blob, fileName);
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const newContent = content.replaceAll(searchQuery, replaceQuery);
    handleContentChange(newContent);
  };

  // Word & Line stats
  const lines = content.split('\n').length;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="flex flex-col w-full max-w-5xl h-[94vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <input
                type="text"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-100 focus:outline-none focus:border-blue-500 max-w-xs sm:max-w-md truncate"
                placeholder="文件名..."
              />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none hidden sm:inline-block"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPreview(prev => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                showPreview 
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="切换实时预览"
            >
              {showPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">实时预览</span>
            </button>

            <button
              onClick={handleDownloadDirect}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
              title="下载此文件"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? '保存中...' : saveSuccess ? '已持久化保存' : '保存文档'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/70 border-b border-slate-800 text-xs overflow-x-auto gap-1">
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
              title="撤销 (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"
              title="重做"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-1" />

            <button
              onClick={() => insertText('# ', '')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="一级标题"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText('## ', '')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="二级标题"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText('**', '**')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="加粗"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText('*', '*')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="斜体"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText('- ', '')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="无序列表"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText('1. ', '')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="有序列表"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText('- [ ] ', '')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="任务待办"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText('```\n', '\n```')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="代码块"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText('| 标题 1 | 标题 2 |\n|---|---|\n| 内容 1 | 内容 2 |\n')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="插入表格"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertText(`> 记录于: ${new Date().toLocaleString()}\n`)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
              title="插入时间戳"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(s => !s)}
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                showSearch ? 'bg-blue-600/30 text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="查找替换"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">查找</span>
            </button>
          </div>
        </div>

        {/* Search & Replace Bar */}
        {showSearch && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-900 border-b border-slate-800 text-xs animate-fadeIn">
            <input
              type="text"
              placeholder="查找文本..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500 w-36 sm:w-48"
            />
            <input
              type="text"
              placeholder="替换为..."
              value={replaceQuery}
              onChange={e => setReplaceQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500 w-36 sm:w-48"
            />
            <button
              onClick={handleReplaceAll}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition"
            >
              全部替换
            </button>
            <button
              onClick={() => setShowSearch(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editor Body (Split or Full) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Text Area */}
          <div className={`flex-1 flex flex-col h-full ${showPreview ? 'border-b md:border-b-0 md:border-r border-slate-800' : ''}`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              placeholder="在此输入或编辑文档内容..."
              className="w-full h-full p-4 bg-slate-950 font-mono text-sm leading-relaxed text-slate-100 resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>

          {/* Markdown Preview Area */}
          {showPreview && (
            <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-auto p-4 sm:p-6 text-slate-200">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>实时渲染预览</span>
              </div>
              
              <div className="prose prose-invert max-w-none prose-sm sm:prose-base space-y-3">
                {content.split('\n\n').map((block, idx) => {
                  if (block.startsWith('# ')) {
                    return <h1 key={idx} className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-1 mt-4">{block.slice(2)}</h1>;
                  }
                  if (block.startsWith('## ')) {
                    return <h2 key={idx} className="text-lg font-semibold text-slate-100 mt-3">{block.slice(3)}</h2>;
                  }
                  if (block.startsWith('### ')) {
                    return <h3 key={idx} className="text-base font-semibold text-slate-200 mt-2">{block.slice(4)}</h3>;
                  }
                  if (block.startsWith('- [ ] ') || block.startsWith('- [x] ')) {
                    const isChecked = block.startsWith('- [x] ');
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" readOnly checked={isChecked} className="rounded text-blue-600 bg-slate-800 border-slate-700" />
                        <span className={isChecked ? 'line-through text-slate-500' : ''}>{block.slice(6)}</span>
                      </div>
                    );
                  }
                  if (block.startsWith('```')) {
                    const cleanCode = block.replace(/```[a-z]*\n?/, '').replace(/```$/, '');
                    return (
                      <pre key={idx} className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                        <code>{cleanCode}</code>
                      </pre>
                    );
                  }
                  if (block.startsWith('> ')) {
                    return (
                      <blockquote key={idx} className="pl-3 border-l-2 border-blue-500 text-slate-400 italic text-sm my-2">
                        {block.slice(2)}
                      </blockquote>
                    );
                  }
                  return <p key={idx} className="text-sm leading-relaxed text-slate-300">{block}</p>;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-4 font-mono">
            <span>{lines} 行</span>
            <span>{words} 词</span>
            <span>{chars} 字符</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              本地持久化就绪
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
