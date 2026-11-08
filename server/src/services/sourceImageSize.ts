// Reads what a browser would draw: the pixel size after any EXIF rotation.
// Headers only, for the three image formats a Source can be.

export interface SourceImageInfo {
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
  extension: '.png' | '.jpg' | '.webp';
  width: number;
  height: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngInfo(data: Buffer): SourceImageInfo | null {
  if (data.length < 24 || !data.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  return { mime_type: 'image/png', extension: '.png', width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

// Orientations 5 to 8 turn the picture a quarter, so width and height trade places.
function exifSwapsSides(segment: Buffer): boolean {
  if (segment.length < 14 || segment.toString('latin1', 0, 6) !== 'Exif\0\0') return false;
  const tiff = segment.subarray(6);
  const little = tiff.toString('latin1', 0, 2) === 'II';
  if (!little && tiff.toString('latin1', 0, 2) !== 'MM') return false;
  const u16 = (offset: number) => (little ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset));
  const u32 = (offset: number) => (little ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset));
  const directory = u32(4);
  if (directory + 2 > tiff.length) return false;
  const entries = u16(directory);
  for (let index = 0; index < entries; index += 1) {
    const entry = directory + 2 + index * 12;
    if (entry + 12 > tiff.length) return false;
    if (u16(entry) === 0x0112) {
      const orientation = u16(entry + 8);
      return orientation >= 5 && orientation <= 8;
    }
  }
  return false;
}

function jpegInfo(data: Buffer): SourceImageInfo | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let swap = false;
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    if (marker === 0xff) { offset += 1; continue; }
    // Markers that stand alone, with no length after them.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { offset += 2; continue; }
    const length = data.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > data.length) return null;
    if (marker === 0xe1) swap = swap || exifSwapsSides(data.subarray(offset + 4, offset + 2 + length));
    // Start-of-frame markers, leaving out the tables that share their range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (length < 7) return null;
      const height = data.readUInt16BE(offset + 5);
      const width = data.readUInt16BE(offset + 7);
      return { mime_type: 'image/jpeg', extension: '.jpg', width: swap ? height : width, height: swap ? width : height };
    }
    if (marker === 0xda) return null;
    offset += 2 + length;
  }
  return null;
}

function webpInfo(data: Buffer): SourceImageInfo | null {
  if (data.length < 30 || data.toString('latin1', 0, 4) !== 'RIFF' || data.toString('latin1', 8, 12) !== 'WEBP') return null;
  const chunk = data.toString('latin1', 12, 16);
  const size = (width: number, height: number): SourceImageInfo => ({ mime_type: 'image/webp', extension: '.webp', width, height });
  if (chunk === 'VP8X') return size(1 + data.readUIntLE(24, 3), 1 + data.readUIntLE(27, 3));
  if (chunk === 'VP8L') {
    if (data[20] !== 0x2f) return null;
    const bits = data.readUInt32LE(21);
    return size(1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff));
  }
  if (chunk === 'VP8 ') {
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) return null;
    return size(data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff);
  }
  return null;
}

/** Null when the bytes are not a readable png, jpeg or webp: the caller says so rather than guess a shape. */
export function readSourceImageInfo(data: Buffer): SourceImageInfo | null {
  const info = pngInfo(data) ?? jpegInfo(data) ?? webpInfo(data);
  return info && info.width > 0 && info.height > 0 ? info : null;
}
