// Cover Studio wiring: photos in (file picker + drag-and-drop), panel layouts,
// per-panel crops (drag to pan, wheel or slider to zoom), live caption controls,
// grades, and PNG export at 1080x1080 / 1080x1350. Ctrl/Cmd+S exports.
import { drawCover } from './cover.js';
import { LAYOUTS, panelCount, panelRects, innerRect, cropRect, hitPanel } from './layout.js';
import { GRADE_NAMES } from './grade.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');
const DEFAULTS = {
  layout: '3-panel', grade: 'vice-sunset', title: 'Sunset Heist', tagline: 'Vice City Stories',
  titleSize: 112, titleCase: 'upper', titleColor: '#ffd166', format: 'square',
};
const state = { ...DEFAULTS, photos: [], panels: [] };
let activePanel = 0;
const setStatus = (t) => { status.textContent = t; };

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// When one photo fills several panels, give the repeats distinct corner crops
// so the collage reads as a montage instead of the same picture three times.
const CROP_VARIANTS = [
  { zoom: 1, ox: 0, oy: 0 },
  { zoom: 1.28, ox: 1, oy: -1 },
  { zoom: 1.45, ox: -1, oy: 1 },
  { zoom: 1.18, ox: 1, oy: 1 },
];
function syncPanels() {
  const n = panelCount(state.layout);
  const rects = panelRects(state.layout, 1080, state.format === 'portrait' ? 1350 : 1080);
  const used = new Set();
  state.panels = Array.from({ length: n }, (_, i) => {
    if (state.panels[i]) { used.add(state.panels[i].photo); return state.panels[i]; }
    const photo = i % Math.max(1, state.photos.length);
    const repeat = used.has(photo);
    used.add(photo);
    const p = { photo, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos[photo];
    if (repeat && img) {
      const v = CROP_VARIANTS[i % CROP_VARIANTS.length];
      const c = cropRect(img, innerRect(rects[i]), v.zoom, v.ox * rects[i].w, v.oy * rects[i].h);
      p.zoom = v.zoom;
      p.ox = c.ox;
      p.oy = c.oy;
    }
    return p;
  });
  activePanel = Math.min(activePanel, n - 1);
}

function redraw() {
  canvas.width = 1080;
  canvas.height = state.format === 'portrait' ? 1350 : 1080;
  drawCover(canvas, state);
}

function syncUI() {
  $('caption').value = state.title;
  $('tagline').value = state.tagline;
  $('titleSize').value = state.titleSize;
  $('sizeVal').textContent = `${state.titleSize}px`;
  $('titleCase').value = state.titleCase;
  $('titleColor').value = state.titleColor;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  $('fmtSquare').classList.toggle('on', state.format === 'square');
  $('fmtPortrait').classList.toggle('on', state.format === 'portrait');
  const sel = $('panelSelect');
  sel.innerHTML = '';
  state.panels.forEach((_, i) => sel.append(new Option(`Panel ${i + 1}`, i)));
  sel.value = activePanel;
  const p = state.panels[activePanel];
  $('zoom').value = p ? p.zoom : 1;
  $('zoomVal').textContent = `${(p ? p.zoom : 1).toFixed(2)}x`;
  const t = $('thumbs');
  t.innerHTML = '';
  state.photos.forEach((img, i) => {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.title = `Use photo ${i + 1} in the selected panel`;
    const im = document.createElement('img');
    im.src = img.src;
    im.alt = `Photo ${i + 1}`;
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = '\u00d7';
    x.title = 'Remove photo';
    x.addEventListener('click', (e) => { e.stopPropagation(); removePhoto(i); });
    d.append(im, x);
    d.addEventListener('click', () => {
      state.panels[activePanel].photo = i;
      redraw();
      setStatus(`Photo ${i + 1} placed in panel ${activePanel + 1}.`);
    });
    t.append(d);
  });
}

async function addFiles(files) {
  const room = 4 - state.photos.length;
  const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, room));
  if (!list.length) { setStatus('Four photos max — remove one first.'); return; }
  for (const f of list) {
    try { state.photos.push(await loadImage(URL.createObjectURL(f))); }
    catch { setStatus(`Could not read ${f.name}.`); }
  }
  syncPanels();
  syncUI();
  redraw();
  setStatus(`${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded.`);
}

function removePhoto(i) {
  state.photos.splice(i, 1);
  state.panels.forEach((p) => { p.photo = Math.min(p.photo, Math.max(0, state.photos.length - 1)); });
  syncPanels();
  syncUI();
  redraw();
}

// --- crop: drag to pan, wheel to zoom -------------------------------------
const coverXY = (e) => {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height, s: r.width / canvas.width };
};
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = coverXY(e);
  const i = hitPanel(x, y, state.layout, canvas.width, canvas.height);
  if (i < 0 || !state.photos.length) return;
  activePanel = i;
  const p = state.panels[i];
  drag = { i, x: e.clientX, y: e.clientY, ox: p.ox, oy: p.oy };
  try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic events have no active pointer */ }
  canvas.classList.add('grabbing');
  syncUI();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { s } = coverXY(e);
  const p = state.panels[drag.i];
  const img = state.photos[p.photo % state.photos.length];
  const box = innerRect(panelRects(state.layout, canvas.width, canvas.height)[drag.i]);
  const c = cropRect(img, box, p.zoom, drag.ox + (e.clientX - drag.x) / s, drag.oy + (e.clientY - drag.y) / s);
  p.ox = c.ox;
  p.oy = c.oy;
  redraw();
});
const endDrag = () => { drag = null; canvas.classList.remove('grabbing'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => {
  if (!state.photos.length) return;
  e.preventDefault();
  const { x, y } = coverXY(e);
  const i = hitPanel(x, y, state.layout, canvas.width, canvas.height);
  const p = state.panels[i >= 0 ? i : activePanel];
  p.zoom = Math.min(3, Math.max(1, p.zoom * Math.exp(-e.deltaY * 0.0012)));
  if (i >= 0) activePanel = i;
  syncUI();
  redraw();
}, { passive: false });

// --- controls ---------------------------------------------------------------
$('photo').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
  state.layout = b.dataset.layout; syncPanels(); syncUI(); redraw();
}));
document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
  state.grade = b.dataset.grade; syncUI(); redraw();
}));
$('caption').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); $('sizeVal').textContent = `${state.titleSize}px`; redraw(); });
$('titleCase').addEventListener('change', (e) => { state.titleCase = e.target.value; redraw(); });
$('titleColor').addEventListener('input', (e) => { state.titleColor = e.target.value; redraw(); });
$('panelSelect').addEventListener('change', (e) => { activePanel = Number(e.target.value); syncUI(); });
$('zoom').addEventListener('input', (e) => {
  const p = state.panels[activePanel];
  if (!p) return;
  p.zoom = Number(e.target.value);
  $('zoomVal').textContent = `${p.zoom.toFixed(2)}x`;
  redraw();
});
$('resetCrop').addEventListener('click', () => {
  const p = state.panels[activePanel];
  if (!p) return;
  p.zoom = 1; p.ox = 0; p.oy = 0;
  syncUI(); redraw();
});
$('fmtSquare').addEventListener('click', () => { state.format = 'square'; syncUI(); redraw(); });
$('fmtPortrait').addEventListener('click', () => { state.format = 'portrait'; syncUI(); redraw(); });

function fileName() {
  const slug = state.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cover';
  return `cover-${slug}.png`;
}
function exportPNG(format) {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = format === 'portrait' ? 1350 : 1080;
  drawCover(c, state);
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved ${a.download} (${c.width}\u00d7${c.height}).`);
  }, 'image/png');
}
$('exportSquare').addEventListener('click', () => exportPNG('square'));
$('exportPortrait').addEventListener('click', () => exportPNG('portrait'));
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    exportPNG(state.format);
  }
});

async function resetAll() {
  Object.assign(state, DEFAULTS);
  state.photos = [];
  state.panels = [];
  activePanel = 0;
  try { state.photos.push(await loadImage('samples/pier.jpg')); } catch { /* offline sample missing */ }
  syncPanels();
  syncUI();
  redraw();
  setStatus('Reset to defaults.');
}
$('reset').addEventListener('click', resetAll);

// --- boot: a ?shot= scene, or the live editor with a sample loaded -----------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    async setup({ name, patch, format, cover }) {
      Object.assign(state, DEFAULTS, { format });
      for (const [k, v] of Object.entries(patch)) if (v !== undefined && v !== null && !Number.isNaN(v)) state[k] = v;
      if (!LAYOUTS.includes(state.layout)) state.layout = DEFAULTS.layout;
      if (!GRADE_NAMES.includes(state.grade)) state.grade = DEFAULTS.grade;
      state.titleSize = Math.min(132, Math.max(96, Number(state.titleSize) || 112));
      try { state.photos = [await loadImage(`samples/${name}.jpg`)]; } catch { state.photos = []; }
      syncPanels();
      syncUI();
      redraw();
      if (cover) fitToWindow();
    },
  });
} else {
  resetAll();
}

/** Cover shot: scale the finished canvas to the window, keeping its aspect. */
function fitToWindow() {
  const fit = () => {
    const s = Math.min(innerWidth / canvas.width, innerHeight / canvas.height);
    canvas.style.width = `${canvas.width * s}px`;
    canvas.style.height = `${canvas.height * s}px`;
  };
  fit();
  addEventListener('resize', fit);
}