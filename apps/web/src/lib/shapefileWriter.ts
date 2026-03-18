/**
 * Minimal Shapefile writer for BeetleSense.ai
 *
 * Produces SHP (geometry), SHX (index), DBF (attributes), and PRJ (projection)
 * files bundled into a ZIP. Supports Point and Polygon geometry types.
 *
 * No external dependencies — uses a minimal ZIP implementation.
 */

// ─── Types ───

export type ShapeType = 'Point' | 'Polygon';

export interface ShapefileField {
  name: string; // max 11 chars
  type: 'C' | 'N' | 'F' | 'D'; // Character, Numeric, Float, Date
  length: number;
  decimals?: number;
}

export interface ShapefileRecord {
  geometry: PointGeometry | PolygonGeometry;
  attributes: Record<string, string | number | null>;
}

export interface PointGeometry {
  type: 'Point';
  x: number;
  y: number;
}

export interface PolygonGeometry {
  type: 'Polygon';
  rings: [number, number][][]; // array of rings, each ring is array of [x, y]
}

// ─── Projection strings ───

const WGS84_PRJ =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

const SWEREF99_TM_PRJ =
  'PROJCS["SWEREF99 TM",GEOGCS["SWEREF99",DATUM["SWEREF99",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",15],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1]]';

export function getPrjString(crs: 'WGS84' | 'SWEREF99'): string {
  return crs === 'SWEREF99' ? SWEREF99_TM_PRJ : WGS84_PRJ;
}

// ─── Binary helpers ───

function allocBuffer(size: number): DataView {
  return new DataView(new ArrayBuffer(size));
}

function writeInt32LE(dv: DataView, offset: number, value: number): void {
  dv.setInt32(offset, value, true);
}

function writeInt32BE(dv: DataView, offset: number, value: number): void {
  dv.setInt32(offset, value, false);
}

function writeFloat64LE(dv: DataView, offset: number, value: number): void {
  dv.setFloat64(offset, value, true);
}

function writeInt16LE(dv: DataView, offset: number, value: number): void {
  dv.setInt16(offset, value, true);
}

// ─── Bounding box ───

interface BBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

function computeBBox(records: ShapefileRecord[]): BBox {
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;

  for (const rec of records) {
    const geom = rec.geometry;
    if (geom.type === 'Point') {
      xMin = Math.min(xMin, geom.x);
      yMin = Math.min(yMin, geom.y);
      xMax = Math.max(xMax, geom.x);
      yMax = Math.max(yMax, geom.y);
    } else {
      for (const ring of geom.rings) {
        for (const [x, y] of ring) {
          xMin = Math.min(xMin, x);
          yMin = Math.min(yMin, y);
          xMax = Math.max(xMax, x);
          yMax = Math.max(yMax, y);
        }
      }
    }
  }

  if (!isFinite(xMin)) {
    xMin = yMin = xMax = yMax = 0;
  }

  return { xMin, yMin, xMax, yMax };
}

// ─── SHP file ───

const SHP_HEADER_SIZE = 100;

function shpPointContentLength(/* _record: ShapefileRecord */): number {
  // shape type (4) + x (8) + y (8) = 20 bytes
  return 20;
}

function shpPolygonContentLength(record: ShapefileRecord): number {
  const geom = record.geometry as PolygonGeometry;
  const numParts = geom.rings.length;
  const numPoints = geom.rings.reduce((s, r) => s + r.length, 0);
  // shape type (4) + bbox (32) + numParts (4) + numPoints (4) + parts array (numParts*4) + points (numPoints*16)
  return 4 + 32 + 4 + 4 + numParts * 4 + numPoints * 16;
}

function writeShpHeader(dv: DataView, fileLength16: number, shapeType: number, bbox: BBox): void {
  writeInt32BE(dv, 0, 9994); // file code
  // bytes 4-23 unused
  writeInt32BE(dv, 24, fileLength16); // file length in 16-bit words
  writeInt32LE(dv, 28, 1000); // version
  writeInt32LE(dv, 32, shapeType);
  writeFloat64LE(dv, 36, bbox.xMin);
  writeFloat64LE(dv, 44, bbox.yMin);
  writeFloat64LE(dv, 52, bbox.xMax);
  writeFloat64LE(dv, 60, bbox.yMax);
  // zMin, zMax, mMin, mMax all 0
}

function buildShp(records: ShapefileRecord[], shapeType: ShapeType): ArrayBuffer {
  const shpType = shapeType === 'Point' ? 1 : 5;
  const bbox = computeBBox(records);

  // Calculate total file size
  let dataSize = 0;
  for (const rec of records) {
    const contentLen =
      shapeType === 'Point'
        ? shpPointContentLength()
        : shpPolygonContentLength(rec);
    dataSize += 8 + contentLen; // record header (8) + content
  }
  const fileSize = SHP_HEADER_SIZE + dataSize;

  const dv = allocBuffer(fileSize);
  writeShpHeader(dv, fileSize / 2, shpType, bbox);

  let offset = SHP_HEADER_SIZE;
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const contentLen =
      shapeType === 'Point'
        ? shpPointContentLength()
        : shpPolygonContentLength(rec);

    // Record header
    writeInt32BE(dv, offset, i + 1); // record number (1-based)
    writeInt32BE(dv, offset + 4, contentLen / 2); // content length in 16-bit words
    offset += 8;

    if (shapeType === 'Point') {
      const geom = rec.geometry as PointGeometry;
      writeInt32LE(dv, offset, 1); // shape type
      writeFloat64LE(dv, offset + 4, geom.x);
      writeFloat64LE(dv, offset + 12, geom.y);
      offset += 20;
    } else {
      const geom = rec.geometry as PolygonGeometry;
      const numParts = geom.rings.length;
      const numPoints = geom.rings.reduce((s, r) => s + r.length, 0);

      writeInt32LE(dv, offset, 5); // shape type: Polygon
      offset += 4;

      // Bounding box for this polygon
      let rxMin = Infinity, ryMin = Infinity, rxMax = -Infinity, ryMax = -Infinity;
      for (const ring of geom.rings) {
        for (const [x, y] of ring) {
          rxMin = Math.min(rxMin, x);
          ryMin = Math.min(ryMin, y);
          rxMax = Math.max(rxMax, x);
          ryMax = Math.max(ryMax, y);
        }
      }
      writeFloat64LE(dv, offset, rxMin);
      writeFloat64LE(dv, offset + 8, ryMin);
      writeFloat64LE(dv, offset + 16, rxMax);
      writeFloat64LE(dv, offset + 24, ryMax);
      offset += 32;

      writeInt32LE(dv, offset, numParts);
      writeInt32LE(dv, offset + 4, numPoints);
      offset += 8;

      // Parts array (starting index of each ring)
      let partStart = 0;
      for (const ring of geom.rings) {
        writeInt32LE(dv, offset, partStart);
        offset += 4;
        partStart += ring.length;
      }

      // Points
      for (const ring of geom.rings) {
        for (const [x, y] of ring) {
          writeFloat64LE(dv, offset, x);
          writeFloat64LE(dv, offset + 8, y);
          offset += 16;
        }
      }
    }
  }

  return dv.buffer as ArrayBuffer;
}

// ─── SHX file ───

function buildShx(records: ShapefileRecord[], shapeType: ShapeType): ArrayBuffer {
  const shpType = shapeType === 'Point' ? 1 : 5;
  const bbox = computeBBox(records);
  const fileSize = SHP_HEADER_SIZE + records.length * 8;
  const dv = allocBuffer(fileSize);
  writeShpHeader(dv, fileSize / 2, shpType, bbox);

  let shpOffset = SHP_HEADER_SIZE; // offset in the SHP file
  let offset = SHP_HEADER_SIZE;
  for (const rec of records) {
    const contentLen =
      shapeType === 'Point'
        ? shpPointContentLength()
        : shpPolygonContentLength(rec);

    writeInt32BE(dv, offset, shpOffset / 2); // offset in 16-bit words
    writeInt32BE(dv, offset + 4, contentLen / 2); // content length in 16-bit words
    offset += 8;
    shpOffset += 8 + contentLen;
  }

  return dv.buffer as ArrayBuffer;
}

// ─── DBF file ───

function buildDbf(records: ShapefileRecord[], fields: ShapefileField[]): ArrayBuffer {
  const numRecords = records.length;
  const numFields = fields.length;
  const headerSize = 32 + numFields * 32 + 1; // 32 header + 32 per field + terminator byte
  const recordSize = 1 + fields.reduce((s, f) => s + f.length, 0); // 1 deletion flag + field data
  const fileSize = headerSize + numRecords * recordSize + 1; // +1 for EOF marker

  const buffer = new ArrayBuffer(fileSize);
  const dv = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Header
  dv.setUint8(0, 3); // version
  const now = new Date();
  dv.setUint8(1, now.getFullYear() - 1900);
  dv.setUint8(2, now.getMonth() + 1);
  dv.setUint8(3, now.getDate());
  writeInt32LE(dv, 4, numRecords);
  writeInt16LE(dv, 8, headerSize);
  writeInt16LE(dv, 10, recordSize);

  // Field descriptors
  let fieldOffset = 32;
  for (const field of fields) {
    const name = field.name.substring(0, 11);
    for (let i = 0; i < name.length; i++) {
      bytes[fieldOffset + i] = name.charCodeAt(i);
    }
    bytes[fieldOffset + 11] = field.type.charCodeAt(0);
    dv.setUint8(fieldOffset + 16, field.length);
    dv.setUint8(fieldOffset + 17, field.decimals ?? 0);
    fieldOffset += 32;
  }
  bytes[fieldOffset] = 0x0d; // header terminator

  // Records
  let recOffset = headerSize;
  for (const rec of records) {
    bytes[recOffset] = 0x20; // not deleted
    let fOffset = recOffset + 1;
    for (const field of fields) {
      const val = rec.attributes[field.name];
      let str = '';
      if (val == null) {
        str = '';
      } else if (field.type === 'N' || field.type === 'F') {
        const numStr = typeof val === 'number' ? val.toFixed(field.decimals ?? 0) : String(val);
        str = numStr.padStart(field.length);
      } else if (field.type === 'D') {
        // YYYYMMDD format
        const d = typeof val === 'string' ? val.replace(/-/g, '') : '';
        str = d.padEnd(field.length);
      } else {
        str = String(val);
      }
      // Write padded string
      const padded = str.substring(0, field.length).padEnd(field.length);
      for (let i = 0; i < padded.length; i++) {
        bytes[fOffset + i] = padded.charCodeAt(i) & 0xff;
      }
      fOffset += field.length;
    }
    recOffset += recordSize;
  }

  bytes[fileSize - 1] = 0x1a; // EOF marker

  return buffer;
}

// ─── Minimal ZIP implementation ───

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();

  // Calculate sizes
  const localHeaders: { offset: number; nameBytes: Uint8Array; crc: number; data: Uint8Array }[] = [];
  let totalLocalSize = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    // Local file header: 30 + nameLen + data
    const headerSize = 30 + nameBytes.length;
    localHeaders.push({ offset: totalLocalSize, nameBytes, crc, data: entry.data });
    totalLocalSize += headerSize + entry.data.length;
  }

  // Central directory
  let centralDirSize = 0;
  for (const lh of localHeaders) {
    centralDirSize += 46 + lh.nameBytes.length;
  }

  // End of central directory: 22 bytes
  const totalSize = totalLocalSize + centralDirSize + 22;
  const result = new Uint8Array(totalSize);
  const view = new DataView(result.buffer);
  let pos = 0;

  // Write local file headers and data
  for (const lh of localHeaders) {
    // Local file header signature
    view.setUint32(pos, 0x04034b50, true);
    pos += 4;
    view.setUint16(pos, 20, true); pos += 2; // version needed
    view.setUint16(pos, 0, true); pos += 2; // flags
    view.setUint16(pos, 0, true); pos += 2; // compression (store)
    view.setUint16(pos, 0, true); pos += 2; // mod time
    view.setUint16(pos, 0, true); pos += 2; // mod date
    view.setUint32(pos, lh.crc, true); pos += 4; // crc-32
    view.setUint32(pos, lh.data.length, true); pos += 4; // compressed size
    view.setUint32(pos, lh.data.length, true); pos += 4; // uncompressed size
    view.setUint16(pos, lh.nameBytes.length, true); pos += 2; // filename length
    view.setUint16(pos, 0, true); pos += 2; // extra field length
    result.set(lh.nameBytes, pos);
    pos += lh.nameBytes.length;
    result.set(lh.data, pos);
    pos += lh.data.length;
  }

  // Write central directory
  const centralDirOffset = pos;
  for (const lh of localHeaders) {
    view.setUint32(pos, 0x02014b50, true); pos += 4; // signature
    view.setUint16(pos, 20, true); pos += 2; // version made by
    view.setUint16(pos, 20, true); pos += 2; // version needed
    view.setUint16(pos, 0, true); pos += 2; // flags
    view.setUint16(pos, 0, true); pos += 2; // compression
    view.setUint16(pos, 0, true); pos += 2; // mod time
    view.setUint16(pos, 0, true); pos += 2; // mod date
    view.setUint32(pos, lh.crc, true); pos += 4; // crc-32
    view.setUint32(pos, lh.data.length, true); pos += 4; // compressed size
    view.setUint32(pos, lh.data.length, true); pos += 4; // uncompressed size
    view.setUint16(pos, lh.nameBytes.length, true); pos += 2; // filename length
    view.setUint16(pos, 0, true); pos += 2; // extra field length
    view.setUint16(pos, 0, true); pos += 2; // comment length
    view.setUint16(pos, 0, true); pos += 2; // disk number
    view.setUint16(pos, 0, true); pos += 2; // internal attrs
    view.setUint32(pos, 0, true); pos += 4; // external attrs
    view.setUint32(pos, lh.offset, true); pos += 4; // relative offset
    result.set(lh.nameBytes, pos);
    pos += lh.nameBytes.length;
  }

  // End of central directory
  view.setUint32(pos, 0x06054b50, true); pos += 4; // signature
  view.setUint16(pos, 0, true); pos += 2; // disk number
  view.setUint16(pos, 0, true); pos += 2; // disk of central dir
  view.setUint16(pos, entries.length, true); pos += 2; // entries on disk
  view.setUint16(pos, entries.length, true); pos += 2; // total entries
  view.setUint32(pos, centralDirSize, true); pos += 4; // central dir size
  view.setUint32(pos, centralDirOffset, true); pos += 4; // central dir offset
  view.setUint16(pos, 0, true); // comment length

  return result;
}

// ─── Public API ───

export interface ShapefileOptions {
  filename: string;
  shapeType: ShapeType;
  fields: ShapefileField[];
  records: ShapefileRecord[];
  crs: 'WGS84' | 'SWEREF99';
}

/**
 * Build a Shapefile ZIP (SHP + SHX + DBF + PRJ) and return as a Blob.
 */
export function buildShapefileZip(options: ShapefileOptions): Blob {
  const { filename, shapeType, fields, records, crs } = options;

  const shp = buildShp(records, shapeType);
  const shx = buildShx(records, shapeType);
  const dbf = buildDbf(records, fields);
  const prj = new TextEncoder().encode(getPrjString(crs));

  const zipData = buildZip([
    { name: `${filename}.shp`, data: new Uint8Array(shp) },
    { name: `${filename}.shx`, data: new Uint8Array(shx) },
    { name: `${filename}.dbf`, data: new Uint8Array(dbf) },
    { name: `${filename}.prj`, data: prj },
  ]);

  return new Blob([zipData as BlobPart], { type: 'application/zip' });
}
