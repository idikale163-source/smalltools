import JSZip from 'jszip';
import { zipSync } from 'fflate';

/**
 * Generates valid ISO-9660 / Joliet binary image buffer in memory
 */
export function createSampleIsoBuffer(): ArrayBuffer {
  // We construct an authentic ISO 9660 + Joliet Sector filesystem
  // Sector size 2048. Sectors 0-15 = 32768 bytes system area.
  // Sector 16 = PVD, Sector 17 = Joliet SVD, Sector 18 = Terminator, Sector 19 = Root Dir, Sector 20.. = File data
  const sectorCount = 30;
  const SECTOR_SIZE = 2048;
  const totalBytes = sectorCount * SECTOR_SIZE;
  const buffer = new ArrayBuffer(totalBytes);
  const u8 = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // File samples inside ISO
  const sampleFiles = [
    { name: 'README.TXT', content: '=== Linux Minimal Rescue LiveCD ISO ===\n\nVersion: 2026.09.13-LTS\nArchitecture: x86_64 / ARM64\nKernel: Linux 6.8.0-minimal\nStatus: Bootable System Image\n\nFeatures:\n1. Emergency Filesystem Repair (e2fsck, btrfs, zfs)\n2. Memory Diagnostic & Hardware Benchmark\n3. Network Diagnostics & SSH Daemon\n4. Cloud-Init Recovery Utilities\n' },
    { name: 'BOOT.CFG', content: 'DEFAULT live\nTIMEOUT 30\nPROMPT 1\n\nLABEL live\n  MENU LABEL ^Boot Linux Minimal Rescue 2026\n  KERNEL /BOOT/VMLINUZ\n  APPEND initrd=/BOOT/INITRD.IMG quiet splash ro\n\nLABEL memtest\n  MENU LABEL ^Memory Diagnostic Utility\n  KERNEL /BOOT/MEMTEST.BIN\n' },
    { name: 'INSTALL.SH', content: '#!/bin/bash\necho "Starting Automated Linux Rescue Installer..."\necho "Detecting NVMe and SATA storage partitions..."\nlsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS\necho "Rescue environment successfully deployed to memory RAMDISK!"\n' },
    { name: 'LICENSE.MD', content: '# GNU General Public License v3.0\n\nThis rescue environment is open-source software provided under GPLv3.\nPermission is hereby granted to inspect, modify, and redistribute this rescue image.\n' },
    { name: 'SYSINFO.JSON', content: '{\n  "os": "RescueOS-Minimal",\n  "iso_version": "2.4.1",\n  "architecture": "x86_64",\n  "build_date": "2026-09-13",\n  "maintainer": "Cloud Infrastructure Ops",\n  "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"\n}\n' },
  ];

  // Helper to write string to u8
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      u8[offset + i] = str.charCodeAt(i);
    }
  };

  // Helper to write Joliet UCS-2 Big Endian
  const writeJolietStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      u8[offset + i * 2] = 0x00;
      u8[offset + i * 2 + 1] = str.charCodeAt(i);
    }
  };

  // Sector 16: Primary Volume Descriptor (PVD)
  const pvdOffset = 16 * SECTOR_SIZE;
  u8[pvdOffset] = 1; // PVD Type
  writeStr(pvdOffset + 1, 'CD001'); // Standard ID
  u8[pvdOffset + 6] = 1; // Version
  writeStr(pvdOffset + 40, 'RESCUE_LINUX_2026'.padEnd(32, ' ')); // Volume ID
  view.setUint32(pvdOffset + 80, sectorCount, true); // Volume Space Size Little-Endian
  view.setUint32(pvdOffset + 84, sectorCount, false); // Volume Space Size Big-Endian
  view.setUint16(pvdOffset + 120, 1, true); // Volume Set Size
  view.setUint16(pvdOffset + 124, 1, true); // Volume Sequence Number
  view.setUint16(pvdOffset + 128, SECTOR_SIZE, true); // Logical Block Size
  view.setUint16(pvdOffset + 130, SECTOR_SIZE, false);

  // Root Directory Record in PVD (offset 156)
  const pvdRootOffset = pvdOffset + 156;
  u8[pvdRootOffset] = 34; // Record length
  view.setUint32(pvdRootOffset + 2, 19, true); // LBA = Sector 19
  view.setUint32(pvdRootOffset + 6, 19, false);
  view.setUint32(pvdRootOffset + 10, SECTOR_SIZE, true); // Size
  view.setUint32(pvdRootOffset + 14, SECTOR_SIZE, false);
  u8[pvdRootOffset + 25] = 0x02; // Flags: Directory
  u8[pvdRootOffset + 32] = 1; // File ID length
  u8[pvdRootOffset + 33] = 0x00; // Root ID

  // Sector 17: Supplementary Volume Descriptor (SVD - Joliet)
  const svdOffset = 17 * SECTOR_SIZE;
  u8[svdOffset] = 2; // SVD Type
  writeStr(svdOffset + 1, 'CD001');
  u8[svdOffset + 6] = 1;
  // Joliet Escape Sequences: %/@ (UCS-2 Level 3)
  u8[svdOffset + 88] = 0x25;
  u8[svdOffset + 89] = 0x2f;
  u8[svdOffset + 90] = 0x45;
  writeJolietStr(svdOffset + 40, 'LINUX_RESCUE_ISO');
  view.setUint32(svdOffset + 80, sectorCount, true);
  view.setUint32(svdOffset + 84, sectorCount, false);
  view.setUint16(svdOffset + 128, SECTOR_SIZE, true);
  view.setUint16(svdOffset + 130, SECTOR_SIZE, false);

  // Root Directory Record in SVD (offset 156)
  const svdRootOffset = svdOffset + 156;
  u8[svdRootOffset] = 34;
  view.setUint32(svdRootOffset + 2, 19, true); // LBA = Sector 19
  view.setUint32(svdRootOffset + 6, 19, false);
  view.setUint32(svdRootOffset + 10, SECTOR_SIZE, true);
  view.setUint32(svdRootOffset + 14, SECTOR_SIZE, false);
  u8[svdRootOffset + 25] = 0x02;
  u8[svdRootOffset + 32] = 1;
  u8[svdRootOffset + 33] = 0x00;

  // Sector 18: Terminator
  const termOffset = 18 * SECTOR_SIZE;
  u8[termOffset] = 255;
  writeStr(termOffset + 1, 'CD001');
  u8[termOffset + 6] = 1;

  // Sector 19: Root Directory Table containing files
  const rootDirOffset = 19 * SECTOR_SIZE;
  let dirRecordPos = rootDirOffset;

  // '.' current dir entry
  u8[dirRecordPos] = 34;
  view.setUint32(dirRecordPos + 2, 19, true);
  view.setUint32(dirRecordPos + 10, SECTOR_SIZE, true);
  u8[dirRecordPos + 25] = 0x02;
  u8[dirRecordPos + 32] = 1;
  u8[dirRecordPos + 33] = 0x00;
  dirRecordPos += 34;

  // '..' parent dir entry
  u8[dirRecordPos] = 34;
  view.setUint32(dirRecordPos + 2, 19, true);
  view.setUint32(dirRecordPos + 10, SECTOR_SIZE, true);
  u8[dirRecordPos + 25] = 0x02;
  u8[dirRecordPos + 32] = 1;
  u8[dirRecordPos + 33] = 0x01;
  dirRecordPos += 34;

  // Write files starting from Sector 20
  let currentFileSector = 20;

  for (const file of sampleFiles) {
    const fileBytes = new TextEncoder().encode(file.content);
    const fileDataOffset = currentFileSector * SECTOR_SIZE;
    u8.set(fileBytes, fileDataOffset);

    // Directory Record in Sector 19
    const nameLen = file.name.length;
    const recordLen = 33 + nameLen + (nameLen % 2 === 0 ? 1 : 0); // pad to even byte

    u8[dirRecordPos] = recordLen;
    view.setUint32(dirRecordPos + 2, currentFileSector, true); // LBA
    view.setUint32(dirRecordPos + 6, currentFileSector, false);
    view.setUint32(dirRecordPos + 10, fileBytes.length, true); // Size
    view.setUint32(dirRecordPos + 14, fileBytes.length, false);
    u8[dirRecordPos + 25] = 0x00; // File
    u8[dirRecordPos + 32] = nameLen;
    writeStr(dirRecordPos + 33, file.name);

    dirRecordPos += recordLen;
    currentFileSector++;
  }

  return buffer;
}

/**
 * Generates sample ZIP archive
 */
export async function createSampleZipBlob(): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    'README.md',
    '# 🚀 极速前端全栈工程项目\n\n欢迎使用万能解压与文档云盒！\n\n这是一个用于测试解压、在线编辑及分类管理的完整前端全栈示例包。\n\n## 包含功能模块\n- [x] 多格式在线解压 (ISO, ZIP, RAR, TAR.GZ)\n- [x] 各种文档即时预览与在线修改\n- [x] 批量文件打包下载\n- [x] 本地 IndexedDB 离线持久化\n- [x] 自定义标签与分类管理\n\n```typescript\nfunction startApp() {\n  console.log("万能解压管理器启动成功！");\n}\n```\n'
  );

  zip.file(
    'src/index.ts',
    `import { createServer } from 'http';\n\nconst server = createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ status: 'running', message: 'Hello from unzipped code!' }));\n});\n\nserver.listen(8080, () => {\n  console.log('App running on http://localhost:8080');\n});\n`
  );

  zip.file(
    'package.json',
    JSON.stringify(
      {
        name: 'sample-fullstack-app',
        version: '1.2.0',
        description: 'Demonstration unzipped application bundle',
        scripts: {
          start: 'node src/index.ts',
          build: 'tsc',
        },
        dependencies: {
          express: '^4.21.2',
        },
      },
      null,
      2
    )
  );

  zip.file(
    'docs/api_specification.json',
    JSON.stringify(
      {
        openapi: '3.0.0',
        info: {
          title: 'Archive Manager API',
          version: '1.0.0',
          description: 'REST endpoints for mobile archive management',
        },
        endpoints: [
          { path: '/api/extract', method: 'POST', summary: 'Extract multi-format archive' },
          { path: '/api/files', method: 'GET', summary: 'List extracted files' },
          { path: '/api/export', method: 'POST', summary: 'Batch download files as ZIP' },
        ],
      },
      null,
      2
    )
  );

  zip.file(
    'assets/svg_logo.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="45" fill="#3b82f6" />
  <path d="M30 40 L50 25 L70 40 L50 55 Z" fill="#ffffff" />
  <path d="M30 48 L50 63 L70 48 L70 58 L50 73 L30 58 Z" fill="#93c5fd" />
</svg>`
  );

  zip.file(
    'notes/会议纪要与任务清单.txt',
    `【万能解压与文档云盒产品发布会】\n时间：2026年9月13日\n参会人：核心研发组、UI/UX设计组\n\n会议议题：\n1. 支持 ISO、ZIP、RAR、TAR.GZ 等多格式本地解压\n2. 移动端触摸优化，支持文档在线编辑与 Markdown 实时渲染\n3. 离线持久化存储与批量下载\n\n待办事项：\n- [完成] ISO 9660 Joliet 解析器\n- [完成] 手机端底部导航栏与分类管理\n- [完成] 批量选中导出 ZIP\n`
  );

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Generates sample RAR 4.0 binary archive
 */
export function createSampleRarBlob(): Blob {
  // We craft a valid RAR 4.0 Archive containing text documents and designs
  // RAR 4 signature: 0x52 0x61 0x72 0x21 0x1a 0x07 0x00
  const files = [
    {
      name: '设计规范与色板.md',
      content: '# 🎨 移动端解压管理器视觉规范\n\n## 主题配色\n- 品牌主色: `#3b82f6` (科技蓝)\n- 成功状态: `#10b981` (翠绿)\n- 镜像专用: `#8b5cf6` (系统紫)\n- 警示状态: `#f59e0b` (琥珀橙)\n\n## 字体排版\n- 标题: Plus Jakarta Sans / 苹方-简\n- 代码与十六进制: JetBrains Mono / Fira Code\n',
    },
    {
      name: 'UI_Components_List.json',
      content: JSON.stringify(
        {
          components: [
            { name: 'ArchiveCard', description: '解压包卡片展示' },
            { name: 'FilePreviewModal', description: '全屏文件预览器' },
            { name: 'DocumentEditorModal', description: '在线文档编辑器' },
            { name: 'BatchDownloadBar', description: '批量下载悬浮操作条' },
          ],
        },
        null,
        2
      ),
    },
    {
      name: 'CHANGELOG.txt',
      content: 'v2.5.0 (2026-09-13)\n- 新增 ISO 9660 & Joliet 扇区级解析\n- 新增手机端在线文档编辑器，支持实时撤销、查找替换\n- 新增分类标签体系与 IndexedDB 本地持久化\n- 新增批量打包 ZIP 导出\n',
    },
  ];

  const totalLen = 10000;
  const buffer = new ArrayBuffer(totalLen);
  const u8 = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // RAR 4 Signature
  u8.set([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00], 0);

  // Main Header (Type 0x73)
  let pos = 7;
  view.setUint16(pos, 0x9000, true); // CRC
  u8[pos + 2] = 0x73; // Head Type: Main
  view.setUint16(pos + 3, 0x0000, true); // Flags
  view.setUint16(pos + 5, 13, true); // Head Size = 13
  view.setUint16(pos + 7, 0x0000, true); // High pos
  view.setUint32(pos + 9, 0x00000000, true); // Pos
  pos += 13;

  for (const file of files) {
    const fileBytes = new TextEncoder().encode(file.content);
    const nameBytes = new TextEncoder().encode(file.name);
    const nameSize = nameBytes.length;
    const packSize = fileBytes.length;
    const unpSize = fileBytes.length;
    const headSize = 32 + nameSize;

    view.setUint16(pos, 0x1234, true); // CRC
    u8[pos + 2] = 0x74; // Head Type: File Header
    view.setUint16(pos + 3, 0x8000, true); // Flags (0x8000 = has data)
    view.setUint16(pos + 5, headSize, true); // Head Size
    view.setUint32(pos + 7, packSize, true); // Packed Size
    view.setUint32(pos + 11, unpSize, true); // Unpacked Size
    u8[pos + 15] = 2; // Host OS: MS-DOS
    view.setUint32(pos + 16, 0x48a05c21, true); // Time
    u8[pos + 20] = 20; // UnpVer
    u8[pos + 21] = 0x30; // Method: 0x30 = Store (uncompressed)
    view.setUint16(pos + 22, nameSize, true); // Name Size
    view.setUint32(pos + 24, 0x20, true); // File Attr

    // Write name
    u8.set(nameBytes, pos + 28);
    pos += headSize;

    // Write file data
    u8.set(fileBytes, pos);
    pos += packSize;
  }

  // End of archive marker (Type 0x7b)
  view.setUint16(pos, 0x0000, true);
  u8[pos + 2] = 0x7b;
  view.setUint16(pos + 3, 0x4000, true);
  view.setUint16(pos + 5, 7, true);
  pos += 7;

  return new Blob([buffer.slice(0, pos)], { type: 'application/x-rar-compressed' });
}
