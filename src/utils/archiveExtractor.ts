import JSZip from 'jszip';
import { gunzipSync } from 'fflate';
import { ArchiveRecord, ExtractedFile } from '../types';
import { detectFileType, getMimeType, isTextFile, arrayBufferToText } from './fileHelpers';
import { parseIsoFile } from './isoParser';
import { parseRarFile } from './rarParser';

export type SupportedFormat = 'zip' | 'rar' | 'iso' | 'tar' | 'gz' | '7z' | 'other';

/**
 * Standard POSIX / ustar Tar Archive Parser
 */
function parseTar(buffer: Uint8Array): { path: string; name: string; size: number; isDirectory: boolean; content?: Uint8Array }[] {
  const results: { path: string; name: string; size: number; isDirectory: boolean; content?: Uint8Array }[] = [];
  let offset = 0;

  const readString = (start: number, length: number) => {
    let str = '';
    for (let i = 0; i < length; i++) {
      const b = buffer[start + i];
      if (b === 0) break;
      str += String.fromCharCode(b);
    }
    return str.trim();
  };

  while (offset + 512 <= buffer.length) {
    const name = readString(offset, 100);
    if (!name) {
      // End of archive marker (empty block)
      break;
    }

    const sizeStr = readString(offset + 124, 12);
    const size = parseInt(sizeStr, 8) || 0;
    const typeFlag = String.fromCharCode(buffer[offset + 156]);
    const isDir = typeFlag === '5' || name.endsWith('/');
    const cleanPath = name.replace(/\/$/, '');
    const parts = cleanPath.split('/').filter(Boolean);
    const simpleName = parts[parts.length - 1] || cleanPath;

    const dataStart = offset + 512;
    const dataEnd = Math.min(buffer.length, dataStart + size);
    const content = isDir ? undefined : buffer.slice(dataStart, dataEnd);

    results.push({
      path: cleanPath,
      name: simpleName,
      size,
      isDirectory: isDir,
      content,
    });

    // Advance to next 512-byte aligned block
    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return results;
}

export function detectArchiveFormat(fileName: string, buffer?: ArrayBuffer): SupportedFormat {
  const lower = fileName.toLowerCase();
  
  if (buffer && buffer.byteLength >= 8) {
    const bytes = new Uint8Array(buffer.slice(0, 16));
    
    // ZIP: 50 4B 03 04 or 50 4B 05 06 (empty) or 50 4B 07 08 (spanned)
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      return 'zip';
    }
    
    // RAR: 52 61 72 21 1A 07
    if (bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21) {
      return 'rar';
    }
    
    // GZIP: 1F 8B
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      return 'gz';
    }
    
    // 7z: 37 7A BC AF 27 1C
    if (bytes[0] === 0x37 && bytes[1] === 0x7a && bytes[2] === 0xbc && bytes[3] === 0xaf) {
      return '7z';
    }
  }

  if (lower.endsWith('.zip') || lower.endsWith('.jar') || lower.endsWith('.apk') || lower.endsWith('.docx') || lower.endsWith('.xlsx')) {
    return 'zip';
  }
  if (lower.endsWith('.rar')) {
    return 'rar';
  }
  if (lower.endsWith('.iso') || lower.endsWith('.img')) {
    return 'iso';
  }
  if (lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return 'tar';
  }
  if (lower.endsWith('.gz')) {
    return 'gz';
  }
  if (lower.endsWith('.7z')) {
    return '7z';
  }
  
  return 'other';
}

export interface ExtractionProgress {
  percent: number;
  message: string;
  currentFile?: string;
}

export async function extractArchive(
  file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer>; size: number },
  onProgress?: (p: ExtractionProgress) => void
): Promise<{ archive: ArchiveRecord; files: ExtractedFile[] }> {
  onProgress?.({ percent: 10, message: '正在读取文件数据...' });
  const buffer = await file.arrayBuffer();
  const format = detectArchiveFormat(file.name, buffer);

  const archiveId = 'arch-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  const now = Date.now();

  let extractedList: {
    path: string;
    name: string;
    size: number;
    isDirectory: boolean;
    content?: ArrayBuffer | Uint8Array;
    lastModified?: number;
  }[] = [];

  onProgress?.({ percent: 30, message: `正在解析 ${format.toUpperCase()} 格式文件结构...` });

  if (format === 'zip') {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(buffer);
    const totalEntries = Object.keys(loadedZip.files).length;
    let count = 0;

    for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
      count++;
      onProgress?.({
        percent: 30 + Math.floor((count / (totalEntries || 1)) * 50),
        message: `正在提取: ${zipEntry.name}`,
        currentFile: zipEntry.name,
      });

      const parts = relativePath.split('/').filter(Boolean);
      const simpleName = parts[parts.length - 1] || relativePath;

      if (zipEntry.dir) {
        extractedList.push({
          path: relativePath.replace(/\/$/, ''),
          name: simpleName,
          size: 0,
          isDirectory: true,
          lastModified: zipEntry.date ? zipEntry.date.getTime() : now,
        });
      } else {
        const contentBuffer = await zipEntry.async('arraybuffer');
        extractedList.push({
          path: relativePath,
          name: simpleName,
          size: contentBuffer.byteLength,
          isDirectory: false,
          content: contentBuffer,
          lastModified: zipEntry.date ? zipEntry.date.getTime() : now,
        });
      }
    }
  } else if (format === 'iso') {
    onProgress?.({ percent: 45, message: '正在解析 ISO 9660 / Joliet 镜像扇区与目录树...' });
    const isoFiles = parseIsoFile(buffer);
    extractedList = isoFiles.map(f => ({
      path: f.path,
      name: f.name,
      size: f.size,
      isDirectory: f.isDirectory,
      content: f.content ? (f.content.buffer as ArrayBuffer) : undefined,
      lastModified: f.lastModified,
    }));
  } else if (format === 'rar') {
    onProgress?.({ percent: 45, message: '正在解析 RAR 压缩分卷与头部块...' });
    const rarFiles = await parseRarFile(buffer);
    extractedList = rarFiles.map(f => ({
      path: f.path,
      name: f.name,
      size: f.size,
      isDirectory: f.isDirectory,
      content: f.content ? (f.content.buffer as ArrayBuffer) : undefined,
      lastModified: f.lastModified,
    }));
  } else if (format === 'tar' || format === 'gz') {
    onProgress?.({ percent: 45, message: '正在解包 TAR / GZ 归档流...' });
    let uncompressedBuffer: Uint8Array = new Uint8Array(buffer);
    
    // If it's gzip, decompress first
    if (file.name.toLowerCase().endsWith('.gz') || (uncompressedBuffer[0] === 0x1f && uncompressedBuffer[1] === 0x8b)) {
      uncompressedBuffer = gunzipSync(uncompressedBuffer);
    }

    if (file.name.toLowerCase().includes('.tar') || format === 'tar') {
      const tarEntries = parseTar(uncompressedBuffer);
      for (const entry of tarEntries) {
        extractedList.push({
          path: entry.path,
          name: entry.name,
          size: entry.size,
          isDirectory: entry.isDirectory,
          content: entry.content ? (entry.content.buffer as ArrayBuffer) : undefined,
          lastModified: now,
        });
      }
    } else {
      // Single un-gzipped file
      const baseName = file.name.replace(/\.gz$/i, '') || 'extracted_file';
      extractedList.push({
        path: baseName,
        name: baseName,
        size: uncompressedBuffer.byteLength,
        isDirectory: false,
        content: uncompressedBuffer.buffer as ArrayBuffer,
        lastModified: now,
      });
    }
  } else {
    // 7z / other format fallback - extract as raw file wrapper or attempt JSZip
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(buffer);
      for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
        const parts = relativePath.split('/').filter(Boolean);
        const simpleName = parts[parts.length - 1] || relativePath;
        if (!zipEntry.dir) {
          const contentBuffer = await zipEntry.async('arraybuffer');
          extractedList.push({
            path: relativePath,
            name: simpleName,
            size: contentBuffer.byteLength,
            isDirectory: false,
            content: contentBuffer,
            lastModified: now,
          });
        }
      }
    } catch {
      // Direct raw item
      extractedList.push({
        path: file.name,
        name: file.name,
        size: buffer.byteLength,
        isDirectory: false,
        content: buffer,
        lastModified: now,
      });
    }
  }

  onProgress?.({ percent: 85, message: '正在构建文件元数据与索引...' });

  // Map to ExtractedFile objects
  const files: ExtractedFile[] = extractedList.map((item, index) => {
    const fileType = item.isDirectory ? 'unknown' : detectFileType(item.name);
    const mimeType = item.isDirectory ? 'directory' : getMimeType(item.name);
    
    let textContent: string | undefined = undefined;
    if (!item.isDirectory && item.content && isTextFile(fileType)) {
      textContent = arrayBufferToText(item.content);
    }

    // Determine default category
    let categoryId = 'cat-other';
    if (format === 'iso') {
      categoryId = 'cat-iso';
    } else if (fileType === 'markdown' || fileType === 'text' || fileType === 'pdf') {
      categoryId = 'cat-docs';
    } else if (fileType === 'code') {
      categoryId = 'cat-code';
    } else if (fileType === 'image' || fileType === 'audio' || fileType === 'video') {
      categoryId = 'cat-media';
    }

    return {
      id: `file-${archiveId}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      archiveId,
      archiveName: file.name,
      path: item.path,
      name: item.name,
      extension: item.name.includes('.') ? item.name.split('.').pop()!.toLowerCase() : '',
      size: item.size,
      mimeType,
      fileType,
      isDirectory: item.isDirectory,
      content: item.content,
      textContent,
      lastModified: item.lastModified || now,
      categoryId,
      tags: [],
    };
  });

  const fileCount = files.filter(f => !f.isDirectory).length;
  const directoryCount = files.filter(f => f.isDirectory).length;

  let defaultArchiveCategory = 'cat-other';
  if (format === 'iso') defaultArchiveCategory = 'cat-iso';
  else if (files.some(f => f.fileType === 'code')) defaultArchiveCategory = 'cat-code';
  else if (files.some(f => f.fileType === 'markdown' || f.fileType === 'pdf')) defaultArchiveCategory = 'cat-docs';
  else if (files.some(f => f.fileType === 'image' || f.fileType === 'video')) defaultArchiveCategory = 'cat-media';

  const archive: ArchiveRecord = {
    id: archiveId,
    name: file.name.replace(/\.[^/.]+$/, ''),
    originalFileName: file.name,
    format,
    size: file.size,
    fileCount,
    directoryCount,
    createdAt: now,
    updatedAt: now,
    categoryId: defaultArchiveCategory,
    tags: [format.toUpperCase()],
  };

  onProgress?.({ percent: 100, message: '解压完成！' });

  return { archive, files };
}

/**
 * Batch package multiple files into a single ZIP for batch downloading
 */
export async function createZipBundle(files: ExtractedFile[], bundleName = 'batch_export.zip'): Promise<Blob> {
  const zip = new JSZip();
  
  for (const file of files) {
    if (file.isDirectory) continue;
    
    if (file.textContent !== undefined) {
      zip.file(file.path || file.name, file.textContent);
    } else if (file.content) {
      zip.file(file.path || file.name, file.content);
    }
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
