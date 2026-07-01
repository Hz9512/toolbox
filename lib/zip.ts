const zipTextEncoder = new TextEncoder();
const crcTable = createCrcTable();

export type ZipInputFile = {
  name: string;
  blob: Blob;
};

type ZipEntry = {
  data: Uint8Array;
  crc: number;
  nameBytes: Uint8Array;
  localHeaderOffset: number;
};

export async function createZip(files: ZipInputFile[]) {
  const entries: ZipEntry[] = [];
  const localParts: BlobPart[] = [];
  let offset = 0;

  for (const file of files) {
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const nameBytes = zipTextEncoder.encode(sanitizeZipPath(file.name));
    const crc = crc32(data);
    const localHeader = createLocalHeader(nameBytes, data.length, crc);

    entries.push({
      data,
      crc,
      nameBytes,
      localHeaderOffset: offset
    });
    localParts.push(localHeader, data);
    offset += localHeader.byteLength + data.byteLength;
  }

  const centralDirectoryParts = entries.map((entry) => createCentralDirectoryHeader(entry));
  const centralDirectorySize = centralDirectoryParts.reduce((size, part) => size + part.byteLength, 0);
  const endRecord = createEndOfCentralDirectory(entries.length, centralDirectorySize, offset);

  return new Blob([...localParts, ...centralDirectoryParts, endRecord], { type: "application/zip" });
}

function createLocalHeader(nameBytes: Uint8Array, size: number, crc: number) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  writeDosDateTime(view, 10);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);

  return header;
}

function createCentralDirectoryHeader(entry: ZipEntry) {
  const header = new Uint8Array(46 + entry.nameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  writeDosDateTime(view, 12);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.data.length, true);
  view.setUint32(24, entry.data.length, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, entry.localHeaderOffset, true);
  header.set(entry.nameBytes, 46);

  return header;
}

function createEndOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return record;
}

function writeDosDateTime(view: DataView, offset: number) {
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  view.setUint16(offset, time, true);
  view.setUint16(offset + 2, date, true);
}

function sanitizeZipPath(name: string) {
  return name.replaceAll("\\", "/").split("/").filter(Boolean).join("/");
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    return value >>> 0;
  });
}
