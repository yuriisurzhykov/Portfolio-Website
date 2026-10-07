// Brand v2 "Billet": palette, the YS mark as exact polygons, outlined type.
import opentype from 'opentype.js';
import fs from 'node:fs';

export const FONTS = process.env.BRAND_FONTS ?? new URL('./fonts', import.meta.url).pathname;
export const C = {
  abyss: '#07090D',    // primary ground
  deep: '#0D1117',     // raised surfaces
  slate: '#1A212C',    // hairlines, ghosted graphics
  haze: '#7D8794',     // secondary text on dark
  platinum: '#E6E9ED', // primary ink on dark
  gold: '#E8B04B',     // the single accent
  ink: '#07090D',      // ink for light media (print, white paper)
  goldInk: '#94650F',  // accent text on white
};

// The mark is a 96×96 billet. A 7-unit channel cuts a Y from the top edge;
// two opposed slots turn the remaining metal into an S. Coordinates are exact.
export const BOX = { w: 96, h: 96 };
export const PIECES = [
  // S: top-left block, down the left side, middle band, down the right side, base
  '0,0 19.05,0 44.5,25.45 44.5,42.5 28,42.5 28,49.5 96,49.5 96,96 0,96 0,76 68,76 68,69 0,69',
  // wedge between the arms of the Y
  '28.95,0 67.05,0 48,19.05',
  // top-right block
  '76.95,0 96,0 96,42.5 51.5,42.5 51.5,25.45',
];
export const NODE = { x: 48, y: 24, r: 6 }; // gold diamond at the junction, half-diagonal 6

export function markInner(ink, node = C.gold) {
  const p = PIECES.map((pts) => `<polygon points="${pts}" fill="${ink}"/>`).join('');
  const n = node ? `<polygon points="${NODE.x},${NODE.y - NODE.r} ${NODE.x + NODE.r},${NODE.y} ${NODE.x},${NODE.y + NODE.r} ${NODE.x - NODE.r},${NODE.y}" fill="${node}"/>` : '';
  return p + n;
}
export function markAt(x, y, h, ink, node = C.gold) {
  const s = h / BOX.h;
  return `<g transform="translate(${x} ${y}) scale(${s})">${markInner(ink, node)}</g>`;
}

const cache = {};
const font = (f) => (cache[f] ??= opentype.parse(fs.readFileSync(`${FONTS}/${f}.ttf`).buffer));
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
// Name over role, outlined. Archivo Expanded cap height ≈ 0.72 em.
export function wordmark(x, y, capH, ink, sub, center = false) {
  const nameSize = capH / 0.72, subSize = nameSize * 0.46, subCap = subSize * 0.73, gap = capH * 0.9;
  const nw = textPath(NAME, 'ArchivoX-500', nameSize, 0, 0, 160).width;
  const dw = textPath(ROLE, 'JetBrainsMono-400', subSize, 0, 0, 180).width;
  const W = Math.max(nw, dw);
  const name = textPath(NAME, 'ArchivoX-500', nameSize, x + (center ? (W - nw) / 2 : 0), y + capH, 160);
  const desc = textPath(ROLE, 'JetBrainsMono-400', subSize, x + (center ? (W - dw) / 2 : 0), y + capH + gap + subCap, 180);
  return { body: `<path d="${name.d}" fill="${ink}"/><path d="${desc.d}" fill="${sub}"/>`, width: W, height: capH + gap + subCap };
}
