// The cover renderer: backdrop gradient, slatted sun, skyline with palms, photo
// panels, poster title and film finish. Deterministic — skyline, palms and the
// noise tile come from fixed seeds; nothing here reads the clock or Math.random.
import { panelRects, innerRect, cropRect, BORDER } from './layout.js';
import { backdrop, paintPhoto } from './grade.js';

const TITLE_FONT = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
const fontAt = (s) => `bold ${s}px ${TITLE_FONT}`;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const d = x.createImageData(256, 256);
  const rnd = mulberry32(0xc0ffee);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.floor(rnd() * 256);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  noiseTile = c;
  return c;
}

/** Sun: radial glow at (540, 690) r300, cut by 6 backdrop-coloured slats. */
function drawSun(ctx, sky) {
  const cx = 540, cy = 690, r = 300;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(255,236,180,0.95)');
  g.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sky;
  for (let i = 0; i < 6; i++) ctx.fillRect(cx - r, cy + i * 34, r * 2, 10 + i * 4.8);
  ctx.restore();
}

/** Bottom-180px silhouette: 24 flat buildings and 12 palms in the side thirds. */
function drawSkyline(ctx, w, h) {
  const rnd = mulberry32(20260521);
  const ink = 'rgba(24,10,42,0.92)';
  ctx.fillStyle = ink;
  const n = 24, widths = [], heights = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const bw = 18 + rnd() * 46;
    widths.push(bw);
    sum += bw;
    heights.push(30 + rnd() * 120);
  }
  const gap = (w - sum) / (n - 1);
  let x = 0;
  for (let i = 0; i < n; i++) {
    ctx.fillRect(x, h - heights[i], widths[i], heights[i]);
    x += widths[i] + gap;
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const px = i < 6 ? 20 + rnd() * (w / 3 - 40) : (w * 2) / 3 + 20 + rnd() * (w / 3 - 40);
    const trunk = 60 + rnd() * 70, lean = (rnd() - 0.5) * 24, topY = h - trunk;
    ctx.beginPath();
    ctx.moveTo(px, h);
    ctx.quadraticCurveTo(px + lean * 0.4, h - trunk * 0.6, px + lean, topY);
    ctx.stroke();
    const fronds = 5 + Math.floor(rnd() * 3);
    for (let f = 0; f < fronds; f++) {
      const th = Math.PI * (0.9 - (0.8 * f) / (fronds - 1));
      const len = 26 + rnd() * 22;
      ctx.beginPath();
      ctx.moveTo(px + lean, topY);
      ctx.quadraticCurveTo(
        px + lean + Math.cos(th) * len * 0.5, topY - Math.sin(th) * len * 0.55 - 10,
        px + lean + Math.cos(th) * len, topY - Math.sin(th) * len * 0.55 + 12,
      );
      ctx.stroke();
    }
  }
}

function drawPanels(ctx, state, w, h) {
  panelRects(state.layout, w, h).forEach((r, i) => {
    const p = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos.length ? state.photos[p.photo % state.photos.length] : null;
    const box = innerRect(r);
    if (img) paintPhoto(ctx, img, box, cropRect(img, box, p.zoom, p.ox, p.oy), state.grade);
    else {
      ctx.fillStyle = 'rgba(20,8,36,0.55)';
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
    // soft inner shadow: fill a frame around the panel, clipped to the panel
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(box.x - 60, box.y - 60, box.w + 120, box.h + 120);
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#000';
    ctx.fill('evenodd');
    ctx.restore();
    ctx.lineWidth = BORDER;
    ctx.strokeStyle = '#f6f1e4';
    ctx.strokeRect(r.x + BORDER / 2, r.y + BORDER / 2, r.w - BORDER, r.h - BORDER);
  });
}

function fitSize(ctx, text, maxW, start, min) {
  let s = start;
  ctx.font = fontAt(s);
  while (s > min && ctx.measureText(text).width > maxW) {
    s -= 2;
    ctx.font = fontAt(s);
  }
  return s;
}

function drawTitle(ctx, state, w, h) {
  const raw = (state.title || '').trim();
  const tag = (state.tagline || '').trim().toUpperCase();
  if (!raw && !tag) return;
  const text = state.titleCase === 'title'
    ? raw.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase())
    : raw.toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const baseY = h - 190;
  let desc = 0;
  if (text) {
    ctx.letterSpacing = '1.5px';
    const size = fitSize(ctx, text, w - 96, state.titleSize, 40);
    const m = ctx.measureText(text);
    const asc = m.actualBoundingBoxAscent || size * 0.8;
    desc = m.actualBoundingBoxDescent || size * 0.2;
    ctx.fillStyle = 'rgba(20,8,36,0.45)';
    ctx.fillRect((w - m.width) / 2 - 12, baseY - asc - 12, m.width + 24, asc + desc + 24);
    ctx.font = fontAt(size);
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#2b1055';
    ctx.strokeText(text, w / 2, baseY);
    ctx.fillStyle = state.titleColor || '#ffd166';
    ctx.fillText(text, w / 2, baseY);
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  }
  if (tag) {
    ctx.letterSpacing = '4px';
    ctx.font = fontAt(34);
    let ts = 34;
    while (ts > 16 && ctx.measureText(tag).width > w - 120) {
      ts -= 2;
      ctx.font = fontAt(ts);
    }
    const tm = ctx.measureText(tag);
    ctx.fillStyle = '#f6f1e4';
    ctx.fillText(tag, w / 2, baseY + desc + 20 + (tm.actualBoundingBoxAscent || ts * 0.8));
  }
  ctx.letterSpacing = '0px';
}

/** Film finish: 8% noise, vignette outside 62% radius, 3 light streaks at ±18°. */
function drawFinish(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = ctx.createPattern(getNoiseTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  const R = Math.hypot(w, h) / 2;
  const v = ctx.createRadialGradient(w / 2, h / 2, R * 0.62, w / 2, h / 2, R);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (const [deg, oy] of [[-18, -h * 0.22], [18, h * 0.06], [-18, h * 0.3]]) {
    ctx.save();
    ctx.translate(w / 2, h / 2 + oy);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.fillRect(-R * 1.2, -1, R * 2.4, 2);
    ctx.restore();
  }
  ctx.restore();
}

/** Paint the whole cover onto the canvas at its own width/height. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const sky = backdrop(ctx, state.grade, w, h);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  drawSun(ctx, sky);
  drawSkyline(ctx, w, h);
  drawPanels(ctx, state, w, h);
  drawTitle(ctx, state, w, h);
  drawFinish(ctx, w, h);
}