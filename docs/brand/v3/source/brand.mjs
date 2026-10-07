// Brand v3 "Seal": a cruciform monogram. A gold Latin cross divides a square
// seal into quadrants; Y fills the short upper-left quadrant, S the tall
// lower-right one, as letters sit in the quarters of the cross in the
// IC XC inscription on icons. To anyone else it reads as a pair of axes.
import opentype from 'opentype.js';
import fs from 'node:fs';

export const FONTS = process.env.BRAND_FONTS ?? new URL('./fonts', import.meta.url).pathname;
export const C = {
  abyss: '#07090D', deep: '#0D1117', slate: '#1A212C', line: '#2A3442',
  haze: '#7D8794', platinum: '#E6E9ED', gold: '#E8B04B', ink: '#07090D', goldInk: '#94650F',
};

const cache = {};
const font = (f) => (cache[f] ??= opentype.parse(fs.readFileSync(`${FONTS}/${f}.ttf`).buffer));

// Glyph scaled so its outline is exactly h tall, centred in a box of width w.
function fit(f, ch, x, y, h, w) {
  const fo = font(f), g = fo.charToGlyph(ch), b = g.getBoundingBox();
  const k = h / (b.y2 - b.y1), gw = (b.x2 - b.x1) * k, ox = x + (w - gw) / 2;
  return { d: g.getPath(ox - b.x1 * k, y + b.y2 * k, fo.unitsPerEm * k).toPathData(3), x: ox, w: gw };
}

// Geometry on a 96-unit square. Crossbar at y 40 makes it a Latin cross.
export const G = { size: 96, frame: 2.5, cx: 48, cy: 40, t: 3.5, gap: 5 };
const q = (() => {
  const { size, frame, cx, cy, t, gap } = G;
  const yBox = { x: frame + gap, y: frame + gap, w: cx - t / 2 - gap - frame - gap, h: cy - t / 2 - gap - frame - gap };
  const sBox = { x: cx + t / 2 + gap, y: cy + t / 2 + gap, w: size - frame - gap - (cx + t / 2 + gap), h: size - frame - gap - (cy + t / 2 + gap) };
  return { yBox, sBox };
})();
export const QUADS = q;
let glyphs;
export function letters() {
  glyphs ??= {
    Y: fit('ArchivoX-900', 'Y', q.yBox.x, q.yBox.y, q.yBox.h, q.yBox.w),
    S: fit('ArchivoN1-800', 'S', q.sBox.x, q.sBox.y, q.sBox.h, q.sBox.w),
  };
  return glyphs;
}

export const crossRects = ({ cx, cy, t, size } = G) => [
  { x: cx - t / 2, y: 0, w: t, h: size },
  { x: 0, y: cy - t / 2, w: size, h: t },
];

// Seal: frame + cross + letters. `accent` colours the cross; pass ink for a one-colour mark.
export function markInner(ink, accent = C.gold, { frame = true } = {}) {
  const { Y, S } = letters();
  const f = G.frame;
  const cross = crossRects().map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${accent ?? ink}"/>`).join('');
  const box = frame ? `<rect x="${f / 2}" y="${f / 2}" width="${G.size - f}" height="${G.size - f}" fill="none" stroke="${ink}" stroke-width="${f}"/>` : '';
  return box + cross + `<path d="${Y.d}" fill="${ink}"/><path d="${S.d}" fill="${ink}"/>`;
}
export const BOX = { w: G.size, h: G.size };
export function markAt(x, y, h, ink, accent = C.gold, opts) {
  return `<g transform="translate(${x} ${y}) scale(${h / G.size})">${markInner(ink, accent, opts)}</g>`;
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

const NAME = 'YURII SURZHYKOV', ROLE = 'ANDROID SYSTEMS ENGINEER';
export function wordmark(x, y, capH, ink, sub, center = false) {
  const nameSize = capH / 0.72, subSize = nameSize * 0.46, subCap = subSize * 0.73, gap = capH * 0.9;
  const nw = textPath(NAME, 'ArchivoX-500', nameSize, 0, 0, 160).width;
  const dw = textPath(ROLE, 'JetBrainsMono-400', subSize, 0, 0, 180).width;
  const W = Math.max(nw, dw);
  const name = textPath(NAME, 'ArchivoX-500', nameSize, x + (center ? (W - nw) / 2 : 0), y + capH, 160);
  const desc = textPath(ROLE, 'JetBrainsMono-400', subSize, x + (center ? (W - dw) / 2 : 0), y + capH + gap + subCap, 180);
  return { body: `<path d="${name.d}" fill="${ink}"/><path d="${desc.d}" fill="${sub}"/>`, width: W, height: capH + gap + subCap };
}
