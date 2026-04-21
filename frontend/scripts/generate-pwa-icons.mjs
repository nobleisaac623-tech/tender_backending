import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

function setPixel(png, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) * 4;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function drawRoundedRect(png, x, y, w, h, r, color) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const inLeft = px < x + r;
      const inRight = px >= x + w - r;
      const inTop = py < y + r;
      const inBottom = py >= y + h - r;
      let inside = true;

      if (inLeft && inTop) {
        const dx = px - (x + r);
        const dy = py - (y + r);
        inside = dx * dx + dy * dy <= r * r;
      } else if (inRight && inTop) {
        const dx = px - (x + w - r - 1);
        const dy = py - (y + r);
        inside = dx * dx + dy * dy <= r * r;
      } else if (inLeft && inBottom) {
        const dx = px - (x + r);
        const dy = py - (y + h - r - 1);
        inside = dx * dx + dy * dy <= r * r;
      } else if (inRight && inBottom) {
        const dx = px - (x + w - r - 1);
        const dy = py - (y + h - r - 1);
        inside = dx * dx + dy * dy <= r * r;
      }

      if (inside) setPixel(png, px, py, color);
    }
  }
}

function drawLine(png, x0, y0, x1, y1, thickness, color) {
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;

  while (true) {
    for (let oy = -Math.floor(thickness / 2); oy <= Math.floor(thickness / 2); oy++) {
      for (let ox = -Math.floor(thickness / 2); ox <= Math.floor(thickness / 2); ox++) {
        setPixel(png, x + ox, y + oy, color);
      }
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function generateIcon(size, outPath) {
  const png = new PNG({ width: size, height: size, colorType: 6 });
  const blue = [37, 99, 235, 255];
  const white = [255, 255, 255, 255];

  drawRoundedRect(png, 0, 0, size, size, Math.floor(size * 0.25), blue);

  const docX = Math.floor(size * 0.28);
  const docY = Math.floor(size * 0.19);
  const docW = Math.floor(size * 0.44);
  const docH = Math.floor(size * 0.62);
  const fold = Math.floor(size * 0.14);
  const stroke = Math.max(2, Math.floor(size * 0.045));

  drawLine(png, docX, docY, docX + docW - fold, docY, stroke, white);
  drawLine(png, docX + docW - fold, docY, docX + docW, docY + fold, stroke, white);
  drawLine(png, docX + docW, docY + fold, docX + docW, docY + docH, stroke, white);
  drawLine(png, docX + docW, docY + docH, docX, docY + docH, stroke, white);
  drawLine(png, docX, docY + docH, docX, docY, stroke, white);

  const cx = Math.floor(size * 0.4);
  const cy = Math.floor(size * 0.54);
  drawLine(png, cx - Math.floor(size * 0.03), cy, cx + Math.floor(size * 0.04), cy + Math.floor(size * 0.07), stroke, white);
  drawLine(png, cx + Math.floor(size * 0.04), cy + Math.floor(size * 0.07), cx + Math.floor(size * 0.18), cy - Math.floor(size * 0.07), stroke, white);

  fs.writeFileSync(outPath, PNG.sync.write(png));
}

const publicDir = path.resolve(process.cwd(), 'public');
generateIcon(192, path.join(publicDir, 'icon-192.png'));
generateIcon(512, path.join(publicDir, 'icon-512.png'));
generateIcon(180, path.join(publicDir, 'apple-touch-icon.png'));

console.log('Generated PWA icons in public/');

