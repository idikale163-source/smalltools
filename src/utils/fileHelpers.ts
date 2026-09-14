import { FileType } from '../types';

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

export function detectFileType(filename: string, mimeType?: string): FileType {
  const ext = getFileExtension(filename);

  // Markdown
  if (['md', 'markdown', 'mdown', 'mkd'].includes(ext)) {
    return 'markdown';
  }

  // Text & Docs
  if (['txt', 'log', 'rtf', 'csv', 'tsv', 'ini', 'conf', 'env'].includes(ext)) {
    return 'text';
  }

  // Code & markup
  if ([
    'js', 'ts', 'jsx', 'tsx', 'json', 'html', 'htm', 'css', 'scss', 'sass', 'less',
    'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'rb', 'sh', 'bash',
    'zsh', 'sql', 'xml', 'yaml', 'yml', 'toml', 'vue', 'svelte'
  ].includes(ext)) {
    return 'code';
  }

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif', 'tiff'].includes(ext)) {
    return 'image';
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) {
    return 'audio';
  }

  // Video
  if (['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi'].includes(ext)) {
    return 'video';
  }

  // PDF
  if (ext === 'pdf') {
    return 'pdf';
  }

  // Archives
  if (['zip', 'rar', 'iso', 'tar', 'gz', 'tgz', '7z', 'bz2', 'xz'].includes(ext)) {
    return 'archive';
  }

  if (mimeType?.startsWith('text/')) {
    return 'text';
  }

  return 'binary';
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const map: Record<string, string> = {
    // text/code
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/typescript',
    jsx: 'text/javascript',
    tsx: 'text/typescript',
    py: 'text/x-python',
    sh: 'text/x-sh',
    sql: 'text/x-sql',
    xml: 'application/xml',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    csv: 'text/csv',
    
    // images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    bmp: 'image/bmp',

    // audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',

    // video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',

    // docs
    pdf: 'application/pdf',

    // archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    iso: 'application/x-iso9660-image',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    '7z': 'application/x-7z-compressed',
  };

  return map[ext] || 'application/octet-stream';
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  
  if (isToday) {
    return `今天 ${timeStr}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${timeStr}`;
}

export function isTextFile(fileType: FileType): boolean {
  return ['text', 'markdown', 'code'].includes(fileType);
}

export function arrayBufferToText(buffer: ArrayBuffer | Uint8Array): string {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    if (buffer instanceof Uint8Array) {
      return decoder.decode(buffer);
    }
    return decoder.decode(new Uint8Array(buffer));
  } catch (e) {
    console.error('Error decoding text buffer', e);
    return '';
  }
}

export function textToArrayBuffer(text: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(text).buffer as ArrayBuffer;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
