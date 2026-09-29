import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // Raw image data: RGBA
  // Background: white (#FFFFFF) with rounded rect (or square with margin)
  // Blue emblem: #007AFF
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);

  const radius = Math.floor(width * 0.22);
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Check rounded rect boundary
      const inX = x >= radius && x < width - radius;
      const inY = y >= radius && y < height - radius;
      let inCard = false;

      if (inX || inY) {
        inCard = true;
      } else {
        const cornerX = x < radius ? radius - x : x - (width - radius - 1);
        const cornerY = y < radius ? radius - y : y - (height - radius - 1);
        if (cornerX * cornerX + cornerY * cornerY <= radius * radius) {
          inCard = true;
        }
      }

      if (!inCard) {
        // Transparent outside
        raw[pxOffset] = 242; // #F2F2F7
        raw[pxOffset + 1] = 242;
        raw[pxOffset + 2] = 247;
        raw[pxOffset + 3] = 255;
        continue;
      }

      // Inside card: default white #FFFFFF
      let r = 255, g = 255, b = 255, a = 255;

      // Draw a subtle blue border / symbol:
      // Plus symbol '+' on the left, Rupee '₹' style bars on right
      // Or a clean blue center icon with '+' and bars:
      // Center cross (plus sign) at cx - width*0.18
      const plusCx = Math.floor(cx - width * 0.18);
      const plusThickness = Math.max(2, Math.floor(width * 0.05));
      const plusLen = Math.floor(width * 0.22);

      const inPlusH = Math.abs(y - cy) <= plusThickness && Math.abs(x - plusCx) <= plusLen;
      const inPlusV = Math.abs(x - plusCx) <= plusThickness && Math.abs(y - cy) <= plusLen;

      // Rupee symbol representation at cx + width*0.16:
      const rCx = Math.floor(cx + width * 0.16);
      const rW = Math.floor(width * 0.18);
      const inTopBar = Math.abs(y - (cy - plusLen)) <= plusThickness && Math.abs(x - rCx) <= rW;
      const inMidBar = Math.abs(y - (cy - plusLen * 0.4)) <= plusThickness && Math.abs(x - rCx) <= rW;
      const inStem = Math.abs(x - (rCx - rW + plusThickness)) <= plusThickness && y >= cy - plusLen && y <= cy + plusLen;
      const inLoop = Math.abs(x - rCx) <= rW && y >= cy - plusLen && y <= cy && (
        Math.abs(y - cy) <= plusThickness || Math.abs(x - (rCx + rW - plusThickness)) <= plusThickness
      );
      const inDiag = Math.abs((x - (rCx - rW * 0.2)) - (y - cy) * 0.8) <= plusThickness * 1.2 && y >= cy && y <= cy + plusLen;

      if (inPlusH || inPlusV || inTopBar || inMidBar || inStem || inLoop || inDiag) {
        r = 0;
        g = 122; // iOS Blue #007AFF
        b = 255;
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(raw);
  const idat = makeChunk('IDAT', idatData);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#FFFFFF"/>
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#E5E5EA" stroke-width="4"/>
  <text x="256" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="210" font-weight="700" fill="#007AFF" text-anchor="middle">+₹</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);
console.log('Saved public/icon.svg');

const png192 = createPng(192, 192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
console.log('Saved public/icon-192.png');

const png512 = createPng(512, 512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
console.log('Saved public/icon-512.png');
