/**
 * ISO 9660 & Joliet File System Parser in Pure TypeScript
 * Supports parsing .iso image files directly in the browser!
 */

export interface IsoParsedFile {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  content?: Uint8Array;
  lastModified: number;
}

const SECTOR_SIZE = 2048;

export function parseIsoFile(arrayBuffer: ArrayBuffer): IsoParsedFile[] {
  const data = new Uint8Array(arrayBuffer);
  const dataView = new DataView(arrayBuffer);
  
  if (data.length < 32768 + SECTOR_SIZE) {
    throw new Error('文件过小，不是有效的 ISO 镜像文件');
  }

  // Find Volume Descriptors starting at sector 16 (offset 32768)
  let sector = 16;
  let pvdRootRecord: { lba: number; size: number } | null = null;
  let svdRootRecord: { lba: number; size: number } | null = null;
  let isJoliet = false;

  while (sector < 32 && (sector * SECTOR_SIZE) < data.length) {
    const offset = sector * SECTOR_SIZE;
    const type = data[offset];
    const identifier = String.fromCharCode(
      data[offset + 1],
      data[offset + 2],
      data[offset + 3],
      data[offset + 4],
      data[offset + 5]
    );

    if (identifier !== 'CD001') {
      // Not an ISO 9660 standard descriptor
      break;
    }

    if (type === 255) {
      // Volume Descriptor Set Terminator
      break;
    }

    if (type === 1) {
      // Primary Volume Descriptor (PVD)
      // Root directory record is at offset + 156
      const rootRecOffset = offset + 156;
      const lba = dataView.getUint32(rootRecOffset + 2, true); // Little endian
      const size = dataView.getUint32(rootRecOffset + 10, true);
      pvdRootRecord = { lba, size };
    } else if (type === 2) {
      // Supplementary Volume Descriptor (SVD / Joliet)
      // Check for Joliet escape sequences (e.g. UCS-2 Level 1/2/3: %/@, %/C, %/E)
      const esc1 = data[offset + 88];
      const esc2 = data[offset + 89];
      const esc3 = data[offset + 90];
      if (esc1 === 0x25 && esc2 === 0x2f && (esc3 === 0x40 || esc3 === 0x43 || esc3 === 0x45)) {
        const rootRecOffset = offset + 156;
        const lba = dataView.getUint32(rootRecOffset + 2, true);
        const size = dataView.getUint32(rootRecOffset + 10, true);
        svdRootRecord = { lba, size };
        isJoliet = true;
      }
    }

    sector++;
  }

  // Prefer Joliet (supports long unicode filenames) over PVD
  const rootRecord = svdRootRecord || pvdRootRecord;
  if (!rootRecord) {
    throw new Error('未检测到有效的 ISO 9660 / Joliet 根目录记录');
  }

  const results: IsoParsedFile[] = [];
  const visitedLBAs = new Set<number>();

  function readDirectory(lba: number, dirSize: number, currentPath: string) {
    if (visitedLBAs.has(lba)) return;
    visitedLBAs.add(lba);

    const dirStartOffset = lba * SECTOR_SIZE;
    if (dirStartOffset >= data.length) return;

    let offset = dirStartOffset;
    const endOffset = Math.min(data.length, dirStartOffset + dirSize);

    while (offset < endOffset) {
      const recordLength = data[offset];
      if (recordLength === 0) {
        // Skip padding to next sector boundary if zero
        const nextSectorOffset = Math.ceil((offset + 1) / SECTOR_SIZE) * SECTOR_SIZE;
        if (nextSectorOffset > offset && nextSectorOffset < endOffset) {
          offset = nextSectorOffset;
          continue;
        } else {
          break;
        }
      }

      if (offset + recordLength > data.length) break;

      const fileLba = dataView.getUint32(offset + 2, true);
      const fileSize = dataView.getUint32(offset + 10, true);
      const flags = data[offset + 25];
      const isDir = (flags & 0x02) !== 0;
      const fileIdLength = data[offset + 32];
      const fileIdOffset = offset + 33;

      let name = '';

      if (fileIdLength === 1 && data[fileIdOffset] === 0x00) {
        // Current directory '.'
        name = '.';
      } else if (fileIdLength === 1 && data[fileIdOffset] === 0x01) {
        // Parent directory '..'
        name = '..';
      } else {
        if (isJoliet) {
          // Joliet uses Big Endian UTF-16 / UCS-2
          const chars: string[] = [];
          for (let i = 0; i < fileIdLength; i += 2) {
            if (fileIdOffset + i + 1 < data.length) {
              const charCode = (data[fileIdOffset + i] << 8) | data[fileIdOffset + i + 1];
              if (charCode !== 0) chars.push(String.fromCharCode(charCode));
            }
          }
          name = chars.join('');
        } else {
          // Standard ASCII
          const chars: string[] = [];
          for (let i = 0; i < fileIdLength; i++) {
            chars.push(String.fromCharCode(data[fileIdOffset + i]));
          }
          name = chars.join('');
        }

        // Clean up version numbers like filename.txt;1
        name = name.replace(/;[0-9]+$/, '');
        // Clean up trailing dot if extension was empty
        if (name.endsWith('.')) {
          name = name.slice(0, -1);
        }
      }

      // Ignore '.' and '..'
      if (name && name !== '.' && name !== '..') {
        const fullPath = currentPath ? `${currentPath}/${name}` : name;

        if (isDir) {
          results.push({
            path: fullPath,
            name: name,
            size: 0,
            isDirectory: true,
            lastModified: Date.now(),
          });
          // Recurse into subdirectory
          readDirectory(fileLba, fileSize, fullPath);
        } else {
          const fileDataStart = fileLba * SECTOR_SIZE;
          const fileDataEnd = Math.min(data.length, fileDataStart + fileSize);
          const fileContent = data.slice(fileDataStart, fileDataEnd);

          results.push({
            path: fullPath,
            name: name,
            size: fileSize,
            isDirectory: false,
            content: fileContent,
            lastModified: Date.now(),
          });
        }
      }

      offset += recordLength;
    }
  }

  readDirectory(rootRecord.lba, rootRecord.size, '');

  return results;
}
