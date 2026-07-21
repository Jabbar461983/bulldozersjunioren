// Erzeugt einfache Platzhalter-App-Icons (PNG) fuer das Web App Manifest.
// Kein externes Bild-Tool noetig: die Icons werden pixelweise gezeichnet und
// per Node-zlib als PNG kodiert. In spaeteren Phasen (Team-Logos, Branding)
// werden diese durch echte Grafiken ersetzt.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbaPixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type 6 = RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  // Ein Filter-Byte (0 = none) pro Zeile vor den Rohpixeldaten.
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgbaPixels[y].copy(raw, rowStart + 1);
  }

  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Vereinsfarben Streethockeyclub Bulldozers (Gruen/Gold).
const PRIMARY = [14, 110, 69]; // #0e6e45
const ACCENT = [176, 141, 42]; // #b08d2a

function distance(x, y, cx, cy) {
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
}

function buildIcon(size, { maskable = false } = {}) {
  const rows = [];
  const cx = size / 2;
  const cy = size / 2;
  // Bei maskable Icons muss das Motiv innerhalb der "safe zone" (~80% der
  // Flaeche mittig) bleiben, da Betriebssysteme die Ecken abschneiden koennen.
  const puckRadius = size * (maskable ? 0.22 : 0.28);
  const ringRadius = size * (maskable ? 0.3 : 0.38);

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4);
    for (let x = 0; x < size; x++) {
      const d = distance(x, y, cx, cy);
      let color = PRIMARY;
      if (d <= puckRadius) {
        color = [10, 12, 18]; // Puck (fast schwarz)
      } else if (d <= ringRadius) {
        color = ACCENT; // Stick/Ring-Akzent
      }
      const offset = x * 4;
      row[offset] = color[0];
      row[offset + 1] = color[1];
      row[offset + 2] = color[2];
      row[offset + 3] = 255;
    }
    rows.push(row);
  }
  return encodePng(size, size, rows);
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true });

const targets = [
  { size: 192, file: 'icon-192.png', maskable: false },
  { size: 512, file: 'icon-512.png', maskable: false },
  { size: 192, file: 'icon-maskable-192.png', maskable: true },
  { size: 512, file: 'icon-maskable-512.png', maskable: true },
];

for (const t of targets) {
  const png = buildIcon(t.size, { maskable: t.maskable });
  const path = new URL(`../public/icons/${t.file}`, import.meta.url);
  writeFileSync(path, png);
  console.log(`geschrieben: public/icons/${t.file}`);
}
