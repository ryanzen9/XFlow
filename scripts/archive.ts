import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * Minimal, deterministic ZIP writer/reader built only on Bun and `node:zlib`.
 *
 * The Chrome Web Store needs a plain ZIP whose root contains `manifest.json`,
 * and a release must be reproducible: the same `dist/` has to produce the same
 * bytes on every machine, so entry order is sorted and every entry carries a
 * fixed timestamp instead of the current clock time.
 */
export interface ArchiveEntry {
  path: string;
  data: Uint8Array;
}

export interface ArchiveRecord {
  path: string;
  size: number;
  compressedSize: number;
  method: "deflate" | "store";
  crc32: number;
  offset: number;
}

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_OF_CENTRAL_DIRECTORY_SIZE = 22;
const VERSION_NEEDED = 20;
/** Unix, ZIP 3.0 — keeps the file mode in the central directory. */
const VERSION_MADE_BY = 0x031e;
const UTF8_NAME_FLAG = 0x0800;
const STORE = 0;
const DEFLATE = 8;
const UNIX_FILE_MODE = 0o644 << 16;
/** DOS timestamp for 2020-01-01 00:00:00, so archives are byte-reproducible. */
const FIXED_DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;
const FIXED_DOS_TIME = 0;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function toBytes(value: Uint8Array): Uint8Array {
  return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
}

interface PreparedEntry {
  path: string;
  name: Uint8Array;
  payload: Uint8Array;
  size: number;
  method: number;
  checksum: number;
}

function prepareEntry(entry: ArchiveEntry): PreparedEntry {
  const deflated = toBytes(deflateRawSync(entry.data, { level: 9 }));
  const keepDeflated = deflated.byteLength < entry.data.byteLength;
  return {
    path: entry.path,
    name: encoder.encode(entry.path),
    payload: keepDeflated ? deflated : entry.data,
    size: entry.data.byteLength,
    method: keepDeflated ? DEFLATE : STORE,
    checksum: crc32(entry.data),
  };
}

export interface ZipOptions {
  /** Entry stored as the first local record, e.g. `manifest.json` for a store upload. */
  first?: string;
}

export function createZip(entries: ArchiveEntry[], options: ZipOptions = {}): Uint8Array {
  const { first } = options;
  const prepared = entries.map(prepareEntry).toSorted((left, right) => {
    if (first) {
      if (left.path === first) return -1;
      if (right.path === first) return 1;
    }
    return left.path < right.path ? -1 : 1;
  });
  const files: Uint8Array[] = [];
  const directories: Uint8Array[] = [];
  let offset = 0;

  for (const entry of prepared) {
    const local = new Uint8Array(LOCAL_HEADER_SIZE + entry.name.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_HEADER_SIGNATURE, true);
    localView.setUint16(4, VERSION_NEEDED, true);
    localView.setUint16(6, UTF8_NAME_FLAG, true);
    localView.setUint16(8, entry.method, true);
    localView.setUint16(10, FIXED_DOS_TIME, true);
    localView.setUint16(12, FIXED_DOS_DATE, true);
    localView.setUint32(14, entry.checksum, true);
    localView.setUint32(18, entry.payload.byteLength, true);
    localView.setUint32(22, entry.size, true);
    localView.setUint16(26, entry.name.byteLength, true);
    localView.setUint16(28, 0, true);
    local.set(entry.name, LOCAL_HEADER_SIZE);
    files.push(local, entry.payload);

    const directory = new Uint8Array(CENTRAL_HEADER_SIZE + entry.name.byteLength);
    const directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, CENTRAL_HEADER_SIGNATURE, true);
    directoryView.setUint16(4, VERSION_MADE_BY, true);
    directoryView.setUint16(6, VERSION_NEEDED, true);
    directoryView.setUint16(8, UTF8_NAME_FLAG, true);
    directoryView.setUint16(10, entry.method, true);
    directoryView.setUint16(12, FIXED_DOS_TIME, true);
    directoryView.setUint16(14, FIXED_DOS_DATE, true);
    directoryView.setUint32(16, entry.checksum, true);
    directoryView.setUint32(20, entry.payload.byteLength, true);
    directoryView.setUint32(24, entry.size, true);
    directoryView.setUint16(28, entry.name.byteLength, true);
    directoryView.setUint16(30, 0, true);
    directoryView.setUint16(32, 0, true);
    directoryView.setUint16(34, 0, true);
    directoryView.setUint16(36, 0, true);
    directoryView.setUint32(38, UNIX_FILE_MODE, true);
    directoryView.setUint32(42, offset, true);
    directory.set(entry.name, CENTRAL_HEADER_SIZE);
    directories.push(directory);

    offset += local.byteLength + entry.payload.byteLength;
  }

  const centralDirectory = concat(directories);
  const end = new Uint8Array(END_OF_CENTRAL_DIRECTORY_SIZE);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, prepared.length, true);
  endView.setUint16(10, prepared.length, true);
  endView.setUint32(12, centralDirectory.byteLength, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return concat([...files, centralDirectory, end]);
}

function dataViewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function findEndOfCentralDirectory(view: DataView): number {
  const earliest = Math.max(0, view.byteLength - END_OF_CENTRAL_DIRECTORY_SIZE - 0xffff);
  for (let offset = view.byteLength - END_OF_CENTRAL_DIRECTORY_SIZE; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) return offset;
  }
  throw new Error("ZIP: end of central directory record not found.");
}

export function readZipDirectory(bytes: Uint8Array): ArchiveRecord[] {
  const view = dataViewOf(bytes);
  const end = findEndOfCentralDirectory(view);
  const total = view.getUint16(end + 10, true);
  const records: ArchiveRecord[] = [];
  let offset = view.getUint32(end + 16, true);

  for (let index = 0; index < total; index += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_HEADER_SIGNATURE) {
      throw new Error(`ZIP: central directory entry ${index} has an unexpected signature.`);
    }
    const method = view.getUint16(offset + 10, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    records.push({
      path: decoder.decode(bytes.subarray(offset + CENTRAL_HEADER_SIZE, offset + CENTRAL_HEADER_SIZE + nameLength)),
      size: view.getUint32(offset + 24, true),
      compressedSize: view.getUint32(offset + 20, true),
      method: method === DEFLATE ? "deflate" : "store",
      crc32: view.getUint32(offset + 16, true),
      offset: view.getUint32(offset + 42, true),
    });
    offset += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
  }

  return records;
}

export function readZipEntry(bytes: Uint8Array, path: string): Uint8Array {
  const record = readZipDirectory(bytes).find((entry) => entry.path === path);
  if (!record) throw new Error(`ZIP: ${path} is not part of the archive.`);

  const view = dataViewOf(bytes);
  if (view.getUint32(record.offset, true) !== LOCAL_HEADER_SIGNATURE) {
    throw new Error(`ZIP: ${path} has an unexpected local header signature.`);
  }
  const nameLength = view.getUint16(record.offset + 26, true);
  const extraLength = view.getUint16(record.offset + 28, true);
  const start = record.offset + LOCAL_HEADER_SIZE + nameLength + extraLength;
  const payload = bytes.subarray(start, start + record.compressedSize);
  const data = record.method === "deflate" ? new Uint8Array(inflateRawSync(payload)) : toBytes(payload);

  if (data.byteLength !== record.size) {
    throw new Error(`ZIP: ${path} expanded to ${data.byteLength} bytes, expected ${record.size}.`);
  }
  if (crc32(data) !== record.crc32) throw new Error(`ZIP: ${path} failed its CRC-32 check.`);
  return data;
}
