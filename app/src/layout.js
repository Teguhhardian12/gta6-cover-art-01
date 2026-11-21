// Panel layout maths: where each photo panel sits on the cover. Rects are outer
// border boxes (12 px outer padding, 14 px gutters); the photo fills the box
// inset by the 10 px border. The collage owns the top ~62%, the title the lower third.
export const PAD = 12;
export const GUTTER = 14;
export const BORDER = 10;
export const LAYOUTS = ['2-panel', '3-panel', '4-panel'];

export function panelCount(layout) {
  return layout === '2-panel' ? 2 : layout === '4-panel' ? 4 : 3;
}

/** Height of the collage area for a cover of this size. */
export function collageHeight(w, h) {
  return Math.round(h * 0.62) - PAD;
}

/** Outer border boxes for the layout's panels, in cover pixels. */
export function panelRects(layout, w, h) {
  const x = PAD, y = PAD, aw = w - PAD * 2, ah = collageHeight(w, h);
  if (layout === '2-panel') {
    // one tall panel left, one wide panel right
    const tall = Math.round(aw * 0.32);
    return [
      { x, y, w: tall, h: ah },
      { x: x + tall + GUTTER, y, w: aw - tall - GUTTER, h: ah },
    ];
  }
  if (layout === '4-panel') {
    const cw = (aw - GUTTER) / 2, ch = (ah - GUTTER) / 2;
    return [0, 1, 2, 3].map((i) => ({
      x: x + (i % 2) * (cw + GUTTER),
      y: y + Math.floor(i / 2) * (ch + GUTTER),
      w: cw, h: ch,
    }));
  }
  // 3-panel: hero left, two stacked on the right
  const hero = Math.round(aw * 0.6);
  const rw = aw - hero - GUTTER, rh = (ah - GUTTER) / 2;
  return [
    { x, y, w: hero, h: ah },
    { x: x + hero + GUTTER, y, w: rw, h: rh },
    { x: x + hero + GUTTER, y: y + rh + GUTTER, w: rw, h: ah - rh - GUTTER },
  ];
}

/** The photo box inside a panel's border. */
export function innerRect(r) {
  return { x: r.x + BORDER, y: r.y + BORDER, w: r.w - BORDER * 2, h: r.h - BORDER * 2 };
}

/** Cover-fit draw rect for an image with zoom + pan; offsets are clamped so the
 *  photo always fills the panel. Returns the clamped offsets too. */
export function cropRect(img, box, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(box.w / iw, box.h / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  const mx = Math.max(0, (dw - box.w) / 2), my = Math.max(0, (dh - box.h) / 2);
  const cx = Math.min(mx, Math.max(-mx, ox)), cy = Math.min(my, Math.max(-my, oy));
  return { dx: box.x + (box.w - dw) / 2 + cx, dy: box.y + (box.h - dh) / 2 + cy, dw, dh, ox: cx, oy: cy };
}

/** Which panel contains a cover-space point, or -1. */
export function hitPanel(x, y, layout, w, h) {
  return panelRects(layout, w, h).findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}