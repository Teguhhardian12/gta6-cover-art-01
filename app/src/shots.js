// Deterministic ?shot= scenes, driven by shots.json queries.
//   ?shot=cover  — the finished poster alone, no editor chrome, fitted to the window
//   ?shot=editor — the full editor UI with a sample photo loaded and caption filled
// photo= accepts pier, boulevard or sample:<n>; layout/grade/tagline/size/case/color
// patch the state. window.__shotReady flips once the scene is painted.
const SAMPLES = ['pier', 'boulevard'];

export function sampleName(query) {
  const p = query.get('photo') || 'pier';
  if (p.startsWith('sample:')) {
    const n = Math.max(1, parseInt(p.slice(7), 10) || 1);
    return SAMPLES[(n - 1) % SAMPLES.length];
  }
  return SAMPLES.includes(p) ? p : 'pier';
}

export async function runShot(shot, query, api) {
  const cover = shot === 'cover';
  document.body.classList.add(cover ? 'shot-cover' : 'shot-editor');
  const num = (k) => (query.has(k) ? Number(query.get(k)) : undefined);
  await api.setup({
    name: sampleName(query),
    cover,
    format: query.get('size') === 'portrait' ? 'portrait' : 'square',
    patch: {
      title: query.get('caption') ?? 'Sunset Heist',
      tagline: query.get('tagline') ?? undefined,
      layout: query.get('layout') ?? undefined,
      grade: query.get('grade') ?? undefined,
      titleSize: num('size'),
      titleCase: query.get('case') ?? undefined,
      titleColor: query.get('color') ?? undefined,
    },
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}