// Brand v3 "Cross": a cruciform monogram. Y and S sit in the quarters of a
// gold Latin cross, as IC XC does on icons and prosphora seals. To anyone else
// it reads as a pair of coordinate axes.
import opentype from 'opentype.js';
import fs from 'node:fs';

export const FONTS = process.env.BRAND_FONTS ?? new URL('./fonts', import.meta.url).pathname;
export const C = {
  abyss: '#07090D', deep: '#0D1117', slate: '#1A212C', line: '#2A3442',
  haze: '#7D8794', platinum: '#E6E9ED', gold: '#E8B04B', ink: '#07090D', goldInk: '#94650F',
};

const cache = {};
const font = (f) => (cache[f] ??= opentype.parse(fs.readFileSync(`${FONTS}/${f}.ttf`).buffer));

// Geometry, in units. A compact Latin cross, 80 × 92: top and side arms are
// 40, the foot is 52, so the mark sits close to a square but still reads as a cross.
// The letters sit against the crossing, a 5-unit gap from the arms, the way
// IC XC sits against the cross on a prosphora seal. No frame: when the mark
// needs a container it gets a filled tile, never an outline.
export const G = { w: 80, h: 92, cx: 40, cy: 40, t: 2.6, gap: 5, yh: 24, sh: 34 };
export const BOX = { w: G.w, h: G.h };
let glyphs;
function place(f, ch, h, x, y, anchor) {
  const fo = font(f), g = fo.charToGlyph(ch), b = g.getBoundingBox(), k = h / (b.y2 - b.y1), w = (b.x2 - b.x1) * k;
  const ox = anchor === 'rb' ? x - w : x, oy = anchor === 'rb' ? y - h : y;
  return { d: g.getPath(ox - b.x1 * k, oy + b.y2 * k, fo.unitsPerEm * k).toPathData(3), x: ox, y: oy, w, h };
}
export function letters() {
  const { cx, cy, t, gap, yh, sh } = G;
  glyphs ??= {
    Y: place('ArchivoX-900', 'Y', yh, cx - t / 2 - gap, cy - t / 2 - gap, 'rb'),
    S: place('ArchivoN1-800', 'S', sh, cx + t / 2 + gap, cy + t / 2 + gap, 'lt'),
  };
  return glyphs;
}
export const crossRects = ({ cx, cy, t, w, h } = G, k = 1) => [
  { x: cx - (t * k) / 2, y: 0, w: t * k, h },
  { x: 0, y: cy - (t * k) / 2, w, h: t * k },
];

// `accent` colours the cross; pass the ink colour for a one-colour mark.
// `weight` thickens the cross for small sizes (1.6 below 48 px).
export function markInner(ink, accent = C.gold, { weight = 1 } = {}) {
  const { Y, S } = letters();
  const cross = crossRects(G, weight).map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${accent ?? ink}"/>`).join('');
  return cross + `<path d="${Y.d} ${S.d}" fill="${ink}"/>`;
}
export const markWidth = (h) => h * G.w / G.h;
export function markAt(x, y, h, ink, accent = C.gold, opts) {
  return `<g transform="translate(${x} ${y}) scale(${h / G.h})">${markInner(ink, accent, opts)}</g>`;
}

// Glyph-by-glyph layout with pair kerning (Archivo's GSUB trips opentype's shaper).
export function textPath(str, f, size, x, y, tracking = 0) {
  const fo = font(f), sc = size / fo.unitsPerEm;
  let d = '', prev = null, cx = x;
  for (const ch of str) {
    const g = fo.charToGlyph(ch);
    if (prev) cx += fo.getKerningValue(prev, g) * sc;
    d += g.getPath(cx, y, size).toPathData(2);
    cx += g.advanceWidth * sc + tracking / 1000 * size;
    prev = g;
  }
  return { d, width: cx - x - tracking / 1000 * size };
}
export const svg = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>\n`;

const NAME = 'YURII SURZHYKOV', ROLE = 'ANDROID PLATFORM & ARCHITECTURE';
export function wordmark(x, y, capH, ink, sub, center = false) {
  const nameSize = capH / 0.72, subSize = nameSize * 0.46, subCap = subSize * 0.73, gap = capH * 0.9;
  const nw = textPath(NAME, 'ArchivoX-500', nameSize, 0, 0, 160).width;
  const dw = textPath(ROLE, 'JetBrainsMono-400', subSize, 0, 0, 180).width;
  const W = Math.max(nw, dw);
  const name = textPath(NAME, 'ArchivoX-500', nameSize, x + (center ? (W - nw) / 2 : 0), y + capH, 160);
  const desc = textPath(ROLE, 'JetBrainsMono-400', subSize, x + (center ? (W - dw) / 2 : 0), y + capH + gap + subCap, 180);
  return { body: `<path d="${name.d}" fill="${ink}"/><path d="${desc.d}" fill="${sub}"/>`, width: W, height: capH + gap + subCap };
}
