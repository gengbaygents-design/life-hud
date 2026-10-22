// Code-native, provisional PWA monogram; no external asset or image dependency.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const buffer = Buffer.alloc(data.length + 12);
  buffer.writeUInt32BE(data.length); name.copy(buffer, 4); data.copy(buffer, 8);
  buffer.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return buffer;
}
for (const size of [192, 512]) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const column = x / size, row = y / size;
    const mark = (column >= .30 && column <= .39 && row >= .25 && row <= .75)
      || (column >= .30 && column <= .70 && row >= .66 && row <= .75);
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    pixels.set(mark ? [174, 220, 249, 255] : [17, 28, 43, 255], offset);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
  const target = path.join(root, `apps/web/public/icon-${size}.png`);
  if (fs.existsSync(target)) throw new Error('Refusing to overwrite an existing icon');
  fs.writeFileSync(target, png);
}
console.log('Provisional 192px and 512px PWA icons created.');
