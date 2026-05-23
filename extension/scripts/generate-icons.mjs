import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "icons");

// CRC32 for PNG chunks. Tiny pure-JS impl so we don't pull in `pngjs` etc.
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]) & 0xff;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Render a tiny TokenGuard mark: dark navy background with a centered
 * blue shield-ish disc. Pure pixel-pushing — no canvas library required.
 */
function renderPng(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.30;
  const barW = Math.max(1, Math.round(size * 0.08));

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // PNG filter byte (none)
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // bg
      let r = 0x14;
      let g = 0x17;
      let b = 0x1c;
      let a = 0xff;

      if (dist < outerR) {
        // outer ring → accent blue
        r = 0x4f;
        g = 0x7c;
        b = 0xff;
      }
      if (dist < innerR) {
        // inner disc → near-white
        r = 0xf5;
        g = 0xf5;
        b = 0xf7;
      }
      // horizontal "guard" bar through the middle
      if (dist < outerR && Math.abs(dy) <= barW / 2) {
        r = 0x6e;
        g = 0xe7;
        b = 0xa3;
      }
      row.push(r, g, b, a);
    }
    rows.push(Buffer.from(row));
  }

  const raw = Buffer.concat(rows);
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const SIZES = [16, 32, 48, 128];
const force = process.argv.includes("--force");

mkdirSync(iconsDir, { recursive: true });
for (const size of SIZES) {
  const out = path.join(iconsDir, `icon-${size}.png`);
  if (!force && existsSync(out)) continue;
  writeFileSync(out, renderPng(size));
  console.log(`[icons] wrote ${out}`);
}

// ──────────────────────────────────────────────────────────────────────
// Chrome Web Store promo tiles (optional but recommended at submission).
// Sizes are fixed by Google: 440×280 small, 920×680 large, 1400×560 marquee.
// We render a centered square logo on a dark canvas — quick & on-brand.
// ──────────────────────────────────────────────────────────────────────

function renderPromo(width, height) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const logoSize = Math.min(width, height) * 0.55;
  const outerR = logoSize * 0.46;
  const innerR = logoSize * 0.30;
  const barW = Math.max(2, Math.round(logoSize * 0.08));

  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = [0];
    for (let x = 0; x < width; x++) {
      // Background gradient: top-left dark indigo → bottom-right near-black.
      const t = (x + y) / (width + height);
      let r = Math.round(0x1a + (0x0a - 0x1a) * t);
      let g = Math.round(0x1f + (0x0d - 0x1f) * t);
      let b = Math.round(0x2e + (0x14 - 0x2e) * t);

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < outerR) {
        r = 0x4f;
        g = 0x7c;
        b = 0xff;
      }
      if (dist < innerR) {
        r = 0xf5;
        g = 0xf5;
        b = 0xf7;
      }
      if (dist < outerR && Math.abs(dy) <= barW / 2) {
        r = 0x6e;
        g = 0xe7;
        b = 0xa3;
      }
      row.push(r, g, b, 0xff);
    }
    rows.push(Buffer.from(row));
  }
  const raw = Buffer.concat(rows);
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const PROMO = [
  ["promo-small-440x280.png", 440, 280],
  ["promo-large-920x680.png", 920, 680],
  ["promo-marquee-1400x560.png", 1400, 560]
];

for (const [filename, w, h] of PROMO) {
  const out = path.join(iconsDir, filename);
  if (!force && existsSync(out)) continue;
  writeFileSync(out, renderPromo(w, h));
  console.log(`[icons] wrote ${out}`);
}
