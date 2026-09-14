export type FileType = 
  | 'text' 
  | 'markdown' 
  | 'code' 
  | 'image' 
  | 'audio' 
  | 'video' 
  | 'pdf' 
  | 'archive' 
  | 'binary' 
  | 'unknown';

export interface ExtractedFile {
  id: string;
  archiveId: string;
  archiveName: string;
  path: string; // full relative path inside archive, e.g. "docs/readme.md"
  name: string; // "readme.md"
  extension: string; // "md"
  size: number;
  mimeType: string;
  fileType: FileType;
  isDirectory: boolean;
  content?: ArrayBuffer | Uint8Array | string; // cached or stored
  textContent?: string; // for quick preview/editing
  blobUrl?: string; // generated preview url
  lastModified: number;
  isEdited?: boolean;
  categoryId?: string;
  tags?: string[];
  notes?: string;
}

export interface ArchiveRecord {
  id: string;
  name: string;
  originalFileName: string;
  format: 'zip' | 'rar' | 'iso' | 'tar' | 'gz' | '7z' | 'other';
  size: number;
  fileCount: number;
  directoryCount: number;
  createdAt: number;
  updatedAt: number;
  categoryId: string;
  tags: string[];
  isFavorite?: boolean;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex or tailwind class
  icon: string; // lucide icon name
  description?: string;
  isSystem?: boolean;
}

export interface StorageStats {
  usedBytes: number;
  archiveCount: number;
  fileCount: number;
  quotaBytes?: number;
}
