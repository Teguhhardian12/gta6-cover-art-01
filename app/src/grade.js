// Colour grades. The backdrop stops are the exact art-direction tokens; each
// grade also carries a canvas filter and a two-colour wash for the photos, so
// the preset reads on both the backdrop and the pictures.
export const GRADES = {
  'vice-sunset': {
    label: 'Vice Sunset',
    stops: [[0, '#2b1055'], [0.28, '#7b2cbf'], [0.62, '#ff6b35'], [1, '#ffd166']],
    filter: 'saturate(1.25) contrast(1.08) brightness(1.03)',
    tint: ['#ff6b35', '#ff2e9e'], tintAlpha: 0.3,
  },
  'neon-night': {
    label: 'Neon Night',
    stops: [[0, '#0b1030'], [0.28, '#1b1f5e'], [0.62, '#00c2d1'], [1, '#ff2e88']],
    filter: 'saturate(1.2) contrast(1.12) brightness(0.94)',
    tint: ['#00c2d1', '#7b2cbf'], tintAlpha: 0.34,
  },
  'miami-pink': {
    label: 'Miami Pink',
    stops: [[0, '#1a0b2e'], [0.28, '#6d28a8'], [0.62, '#ff4d9d'], [1, '#ffe0b3']],
    filter: 'saturate(1.3) contrast(1.05) brightness(1.05)',
    tint: ['#ff4d9d', '#ffb36b'], tintAlpha: 0.28,
  },
  'noir': {
    label: 'Noir',
    stops: [[0, '#0a0a0d'], [0.28, '#1c1c22'], [0.62, '#3a3a46'], [1, '#c9c9d4']],
    filter: 'grayscale(1) contrast(1.18) brightness(0.98)',
    tint: ['#2c2c36', '#c9c9d4'], tintAlpha: 0.16,
  },
};
export const GRADE_NAMES = Object.keys(GRADES);

/** The vertical backdrop gradient for a grade (also used to cut the sun slats). */
export function backdrop(ctx, grade, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [o, c] of GRADES[grade].stops) g.addColorStop(o, c);
  return g;
}

/** Paint one photo into a panel box: cover-fit crop, grade filter, tint wash. */
export function paintPhoto(ctx, img, box, crop, grade) {
  const g = GRADES[grade];
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.filter = g.filter;
  ctx.drawImage(img, crop.dx, crop.dy, crop.dw, crop.dh);
  ctx.filter = 'none';
  const wash = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  wash.addColorStop(0, g.tint[0]);
  wash.addColorStop(1, g.tint[1]);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = g.tintAlpha;
  ctx.fillStyle = wash;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}