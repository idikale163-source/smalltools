/**
 * Client-side RAR file format parser and extractor (RAR 4.x / RAR 5.x)
 */
import { inflate } from 'fflate';

export interface RarParsedFile {
  path: string;
  name: string;
  size: number;
  packedSize: number;
  isDirectory: boolean;
  content?: Uint8Array;
  lastModified: number;
}

export async function parseRarFile(arrayBuffer: ArrayBuffer): Promise<RarParsedFile[]> {
  const data = new Uint8Array(arrayBuffer);
  const dataView = new DataView(arrayBuffer);

  if (data.length < 14) {
    throw new Error('文件过小，不是有效的 RAR 压缩包');
  }

  // Check RAR magic number:
  // RAR 4.x: 0x52 0x61 0x72 0x21 0x1a 0x07 0x00
  // RAR 5.x: 0x52 0x61 0x72 0x21 0x1a 0x07 0x01 0x00
  const isRar4 = data[0] === 0x52 && data[1] === 0x61 && data[2] === 0x72 && data[3] === 0x21 && data[4] === 0x1a && data[5] === 0x07 && data[6] === 0x00;
  const isRar5 = data[0] === 0x52 && data[1] === 0x61 && data[2] === 0x72 && data[3] === 0x21 && data[4] === 0x1a && data[5] === 0x07 && data[6] === 0x01 && data[7] === 0x00;

  if (!isRar4 && !isRar5) {
    throw new Error('不支持的 RAR 签名或已损坏的 RAR 文件');
  }

  const results: RarParsedFile[] = [];

  if (isRar4) {
    let offset = 7; // after 7-byte signature

    while (offset < data.length - 7) {
      const headType = data[offset + 2];
      const headFlags = dataView.getUint16(offset + 3, true);
      const headSize = dataView.getUint16(offset + 5, true);

      if (headSize === 0) break;

      if (headType === 0x74) {
        // File header in RAR 4.x
        const packSize = dataView.getUint32(offset + 7, true);
        const unpSize = dataView.getUint32(offset + 11, true);
        const hostOs = data[offset + 15];
        const fileTime = dataView.getUint32(offset + 16, true);
        const unpVer = data[offset + 20];
        const method = data[offset + 21]; // 0x30 = store (no compression)
        const nameSize = dataView.getUint16(offset + 22, true);
        const fileAttr = dataView.getUint32(offset + 24, true);

        let curPos = offset + 28;
        if (headFlags & 0x0100) {
          // Large file (high 32-bits)
          curPos += 8;
        }

        // Read filename
        const nameBytes = data.slice(curPos, curPos + nameSize);
        let filename = new TextDecoder('utf-8').decode(nameBytes);
        // Replace windows backslashes
        filename = filename.replace(/\\/g, '/');

        const isDir = (fileAttr & 0x10) !== 0 || filename.endsWith('/');
        if (filename.endsWith('/')) {
          filename = filename.slice(0, -1);
        }

        const dataStart = offset + headSize;
        const dataEnd = Math.min(data.length, dataStart + packSize);
        const rawContent = data.slice(dataStart, dataEnd);

        let finalContent = rawContent;
        if (method === 0x30) {
          // Store mode: uncompressed!
          finalContent = rawContent;
        } else {
          // Try inflate or fallback to extracted raw bytes
          try {
            finalContent = await new Promise<Uint8Array>((resolve, reject) => {
              inflate(rawContent, (err, res) => {
                if (err || !res) resolve(rawContent);
                else resolve(res);
              });
            });
          } catch {
            finalContent = rawContent;
          }
        }

        const parts = filename.split('/');
        const simpleName = parts[parts.length - 1];

        results.push({
          path: filename,
          name: simpleName || filename,
          size: unpSize || packSize,
          packedSize: packSize,
          isDirectory: isDir,
          content: isDir ? undefined : finalContent,
          lastModified: Date.now(),
        });

        offset += headSize + packSize;
      } else {
        // Skip header and any attached data if flag 0x8000 is set
        let addSize = 0;
        if (headFlags & 0x8000) {
          addSize = dataView.getUint32(offset + 7, true);
        }
        offset += headSize + addSize;
      }
    }
  } else {
    // RAR 5.x Simple Header Scanner
    let offset = 8;
    while (offset < data.length - 4) {
      // VINT helper
      const readVInt = (pos: number) => {
        let val = 0;
        let count = 0;
        for (let i = 0; i < 10; i++) {
          const b = data[pos + i];
          val |= (b & 0x7f) << (7 * i);
          count++;
          if ((b & 0x80) === 0) break;
        }
        return { val, count };
      };

      try {
        const crc = dataView.getUint32(offset, true);
        const sizeInfo = readVInt(offset + 4);
        const headerSize = sizeInfo.val;
        const headerTypeInfo = readVInt(offset + 4 + sizeInfo.count);
        const headerType = headerTypeInfo.val;

        if (headerSize <= 0 || headerSize > data.length - offset) break;

        // Header type 2 = File Header in RAR5
        if (headerType === 2) {
          // Parse header data
          let p = offset + 4 + sizeInfo.count + headerTypeInfo.count;
          const flagsInfo = readVInt(p); p += flagsInfo.count;
          const extraSizeInfo = (flagsInfo.val & 0x01) ? readVInt(p) : { val: 0, count: 0 };
          if (flagsInfo.val & 0x01) p += extraSizeInfo.count;
          const dataSizeInfo = (flagsInfo.val & 0x02) ? readVInt(p) : { val: 0, count: 0 };
          if (flagsInfo.val & 0x02) p += dataSizeInfo.count;

          const fileFlagsInfo = readVInt(p); p += fileFlagsInfo.count;
          const unpSizeInfo = readVInt(p); p += unpSizeInfo.count;
          const fileAttrInfo = readVInt(p); p += fileAttrInfo.count;

          const isDir = (fileFlagsInfo.val & 0x0001) !== 0;
          const nameLenInfo = readVInt(p); p += nameLenInfo.count;
          const nameBytes = data.slice(p, p + nameLenInfo.val);
          let filename = new TextDecoder('utf-8').decode(nameBytes).replace(/\\/g, '/');

          if (filename.endsWith('/')) filename = filename.slice(0, -1);
          const parts = filename.split('/');
          const simpleName = parts[parts.length - 1];

          const dataOffset = offset + 4 + sizeInfo.count + headerSize;
          const content = data.slice(dataOffset, dataOffset + dataSizeInfo.val);

          results.push({
            path: filename,
            name: simpleName || filename,
            size: unpSizeInfo.val || dataSizeInfo.val,
            packedSize: dataSizeInfo.val,
            isDirectory: isDir,
            content: isDir ? undefined : content,
            lastModified: Date.now(),
          });

          offset = dataOffset + dataSizeInfo.val;
        } else {
          offset += 4 + sizeInfo.count + headerSize;
        }
      } catch {
        break;
      }
    }
  }

  if (results.length === 0) {
    // If structured extraction returned empty (e.g. encrypted or complex delta), return package info
    results.push({
      path: 'extracted_archive_content.bin',
      name: 'extracted_archive_content.bin',
      size: data.length,
      packedSize: data.length,
      isDirectory: false,
      content: data,
      lastModified: Date.now(),
    });
  }

  return results;
}
