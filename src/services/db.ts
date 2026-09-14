import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ArchiveRecord, ExtractedFile, Category } from '../types';

interface ArchiveAppDBSchema extends DBSchema {
  archives: {
    key: string;
    value: ArchiveRecord;
    indexes: {
      'by-category': string;
      'by-created': number;
    };
  };
  files: {
    key: string;
    value: ExtractedFile;
    indexes: {
      'by-archive': string;
      'by-category': string;
      'by-fileType': string;
      'by-path': string;
    };
  };
  categories: {
    key: string;
    value: Category;
  };
}

const DB_NAME = 'UniversalArchiveHubDB';
const DB_VERSION = 1;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-all', name: '全部文件', color: '#3b82f6', icon: 'FolderArchive', description: '所有解压与保存的文件', isSystem: true },
  { id: 'cat-docs', name: '文档资料', color: '#10b981', icon: 'FileText', description: 'Markdown、TXT、PDF、代码等文档', isSystem: true },
  { id: 'cat-iso', name: '镜像与系统 (ISO)', color: '#8b5cf6', icon: 'Disc', description: 'ISO 镜像、启动盘与安装包', isSystem: true },
  { id: 'cat-media', name: '图片与音视频', color: '#f59e0b', icon: 'Image', description: '图片、录音、背景音效与视频素材', isSystem: true },
  { id: 'cat-code', name: '项目源码 (Code)', color: '#06b6d4', icon: 'Code', description: '前端、后端或脚本源文件', isSystem: true },
  { id: 'cat-other', name: '未分类 / 杂项', color: '#6b7280', icon: 'Archive', description: '其他临时解压文件', isSystem: true },
];

let dbPromise: Promise<IDBPDatabase<ArchiveAppDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<ArchiveAppDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ArchiveAppDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Archives store
        const archiveStore = db.createObjectStore('archives', { keyPath: 'id' });
        archiveStore.createIndex('by-category', 'categoryId');
        archiveStore.createIndex('by-created', 'createdAt');

        // Files store
        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('by-archive', 'archiveId');
        fileStore.createIndex('by-category', 'categoryId');
        fileStore.createIndex('by-fileType', 'fileType');
        fileStore.createIndex('by-path', 'path');

        // Categories store
        const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
        DEFAULT_CATEGORIES.forEach(cat => categoryStore.put(cat));
      },
    });
  }
  return dbPromise;
}

// ----------------- Archive Operations -----------------

export async function saveArchive(archive: ArchiveRecord, files: ExtractedFile[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['archives', 'files'], 'readwrite');
  await tx.objectStore('archives').put(archive);
  
  for (const file of files) {
    // Ensure content serialization for IndexedDB
    await tx.objectStore('files').put(file);
  }
  await tx.done;
}

export async function getAllArchives(): Promise<ArchiveRecord[]> {
  const db = await getDB();
  const archives = await db.getAllFromIndex('archives', 'by-created');
  return archives.reverse(); // newest first
}

export async function getArchiveById(id: string): Promise<ArchiveRecord | undefined> {
  const db = await getDB();
  return db.get('archives', id);
}

export async function updateArchive(archive: ArchiveRecord): Promise<void> {
  const db = await getDB();
  await db.put('archives', archive);
}

export async function deleteArchive(archiveId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['archives', 'files'], 'readwrite');
  
  // delete archive
  await tx.objectStore('archives').delete(archiveId);
  
  // delete all associated files
  const fileIndex = tx.objectStore('files').index('by-archive');
  let cursor = await fileIndex.openCursor(IDBKeyRange.only(archiveId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ----------------- File Operations -----------------

export async function getFilesByArchive(archiveId: string): Promise<ExtractedFile[]> {
  const db = await getDB();
  return db.getAllFromIndex('files', 'by-archive', archiveId);
}

export async function getAllFiles(): Promise<ExtractedFile[]> {
  const db = await getDB();
  return db.getAll('files');
}

export async function getFileById(id: string): Promise<ExtractedFile | undefined> {
  const db = await getDB();
  return db.get('files', id);
}

export async function updateFile(file: ExtractedFile): Promise<void> {
  const db = await getDB();
  await db.put('files', {
    ...file,
    lastModified: Date.now(),
  });
}

export async function deleteFile(fileId: string): Promise<void> {
  const db = await getDB();
  const file = await db.get('files', fileId);
  if (file) {
    await db.delete('files', fileId);
    // update archive count
    const archive = await db.get('archives', file.archiveId);
    if (archive) {
      archive.fileCount = Math.max(0, archive.fileCount - 1);
      archive.updatedAt = Date.now();
      await db.put('archives', archive);
    }
  }
}

export async function batchDeleteFiles(fileIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['files', 'archives'], 'readwrite');
  for (const id of fileIds) {
    await tx.objectStore('files').delete(id);
  }
  await tx.done;
}

export async function batchUpdateCategory(fileIds: string[], categoryId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('files', 'readwrite');
  for (const id of fileIds) {
    const file = await tx.store.get(id);
    if (file) {
      file.categoryId = categoryId;
      await tx.store.put(file);
    }
  }
  await tx.done;
}

// ----------------- Category Operations -----------------

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  const categories = await db.getAll('categories');
  if (categories.length === 0) {
    const tx = db.transaction('categories', 'readwrite');
    for (const cat of DEFAULT_CATEGORIES) {
      await tx.store.put(cat);
    }
    await tx.done;
    return DEFAULT_CATEGORIES;
  }
  return categories;
}

export async function saveCategory(category: Category): Promise<void> {
  const db = await getDB();
  await db.put('categories', category);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const db = await getDB();
  await db.delete('categories', categoryId);
}

// ----------------- Storage Usage Calculation -----------------

export async function getStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number; percentage: number }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || (1024 * 1024 * 1024 * 2); // default 2GB
      return {
        usedBytes: used,
        quotaBytes: quota,
        percentage: Math.min(100, (used / quota) * 100),
      };
    }
  } catch (e) {
    console.error('Storage estimate error', e);
  }
  return { usedBytes: 0, quotaBytes: 1024 * 1024 * 1024, percentage: 0 };
}
