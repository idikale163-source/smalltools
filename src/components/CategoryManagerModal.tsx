import React, { useState } from 'react';
import { X, Plus, Folder, Tag, Check, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { Category } from '../types';

interface CategoryManagerModalProps {
  categories: Category[];
  onClose: () => void;
  onSaveCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  categories,
  onClose,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const cat: Category = {
      id: editingCatId || `cat-custom-${Date.now()}`,
      name: newCatName.trim(),
      color: newCatColor,
      description: newCatDesc.trim(),
      icon: 'Folder',
      isSystem: false,
    };

    await onSaveCategory(cat);
    setNewCatName('');
    setNewCatDesc('');
    setEditingCatId(null);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatColor(cat.color);
    setNewCatDesc(cat.description || '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="flex flex-col w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">分类与标签管理</h2>
              <p className="text-xs text-slate-400">对解压出的镜像、文档、代码与媒体文件自定义归类</p>
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
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Create / Edit Form */}
          <form onSubmit={handleAddCategory} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>{editingCatId ? '编辑分类' : '新建分类标签'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">分类名称</label>
                <input
                  type="text"
                  placeholder="例如：公司发票、Linux工具箱..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">分类描述 (可选)</label>
                <input
                  type="text"
                  placeholder="分类说明备注..."
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Color selection */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">选择标识色</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110 relative"
                    style={{ backgroundColor: color }}
                  >
                    {newCatColor === color && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setNewCatName('');
                    setNewCatDesc('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
                >
                  取消
                </button>
              )}
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow transition disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingCatId ? '更新分类' : '添加分类'}</span>
              </button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              当前分类列表 ({categories.length})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    >
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-100 truncate">{cat.name}</span>
                        {cat.isSystem && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                            系统
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-slate-400 truncate">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  {!cat.isSystem && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                        title="编辑"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCategory(cat.id)}
                        className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
