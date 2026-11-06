// Test photos generated in memory, so no binary files live in the repo.
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A solid-color RGB PNG. */
export function makePng(width = 240, height = 300, [r, g, b] = [90, 120, 170]) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolor
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The e2e build reads the clothing type from the file name, so
 * photo('tshirt') is recognized as a T-shirt and photo('mystery') is not recognized.
 */
export function photo(name, { ext = 'png', mimeType } = {}) {
  const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', heic: 'image/heic' };
  return { name: `${name}.${ext}`, mimeType: mimeType || types[ext], buffer: makePng() };
}

/** A file with a supported extension that isn't really an image (U19). */
export function brokenPhoto(name = 'tshirt-broken') {
  return { name: `${name}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from('this is not an image') };
}

/** A supported type that's just over 10 MB (U14). */
export function oversizedPhoto() {
  return { name: 'huge-tshirt.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1) };
}

export function textFile() {
  return { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') };
}

export function pdfFile() {
  return { name: 'pattern.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') };
}
