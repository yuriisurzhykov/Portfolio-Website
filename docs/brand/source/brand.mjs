// Shared brand primitives: palette, the YS mark, wordmark-as-paths.
import opentype from 'opentype.js';
import fs from 'node:fs';
export const FONTS = process.env.BRAND_FONTS ?? new URL('./fonts', import.meta.url).pathname;
export const C = {
  graphite: '#121316', carbon: '#1E1F23', iron: '#34363C', alloy: '#8E929A',
  steel: '#5F636B', mist: '#D6D7D3', paper: '#F1F1EE', amber: '#F4B400', amberInk: '#8A6200',
};
// Mark geometry on a 6-unit stroke grid. Bounding box: x 25..81.24, y 6..87.
export const BOX = { x: 25, y: 6, w: 56.24, h: 81 };
const Y_POLY = '38.76,6 47.24,6 60,18.76 72.76,6 81.24,6 63,24.24 63,27 57,27 57,24.24';
const ROUTE = 'M60 23V34A10 10 0 0 1 50 44H38A10 10 0 0 0 38 64H58A10 10 0 0 1 58 84H25';
export function markInner(ink, node = C.amber, sw = 6) {
  return `<polygon points="${Y_POLY}" fill="${ink}"/>` +
    `<path d="${ROUTE}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="miter"/>` +
    (node ? `<circle cx="60" cy="23" r="4.5" fill="${node}"/>` : '');
}
// Place the mark so its bounding box has height h with top-left at (x, y).
export function markAt(x, y, h, ink, node = C.amber) {
  const s = h / BOX.h;
  return `<g transform="translate(${x} ${y}) scale(${s}) translate(${-BOX.x} ${-BOX.y})">${markInner(ink, node)}</g>`;
}
export const markWidth = (h) => h * BOX.w / BOX.h;

const cache = {};
const font = (f) => (cache[f] ??= opentype.parse(fs.readFileSync(`${FONTS}/${f}.ttf`).buffer));
// Text as outlined path; returns { d, width }.
export function textPath(str, f, size, x, y, tracking = 0) {
  const fo = font(f);
  const p = fo.getPath(str, x, y, size, { tracking });
  const adv = fo.getAdvanceWidth(str, size, { tracking }) - tracking / 1000 * size;
  return { d: p.toPathData(2), width: adv };
}
export const svg = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>\n`;

// Wordmark block: name over descriptor, outlined. Returns { body, width, height }.
export function wordmark(x, y, capH, ink, sub, center = false) {
  const nameSize = capH / 0.7;           // Geist cap height ≈ 0.70 em
  const nw = textPath('YURII SURZHYKOV', 'Geist-500', nameSize, 0, 0, 220).width;
  const subSize = nameSize * 0.42;
  const subCap = subSize * 0.7;
  const gap = capH * 0.95;
  const dw = textPath('ANDROID SYSTEMS ENGINEER', 'GeistMono-400', subSize, 0, 0, 240).width;
  const W = Math.max(nw, dw);
  const name = textPath('YURII SURZHYKOV', 'Geist-500', nameSize, x + (center ? (W - nw) / 2 : 0), y + capH, 220);
  const desc = textPath('ANDROID SYSTEMS ENGINEER', 'GeistMono-400', subSize, x + (center ? (W - dw) / 2 : 0), y + capH + gap + subCap, 240);
  return {
    body: `<path d="${name.d}" fill="${ink}"/><path d="${desc.d}" fill="${sub}"/>`,
    width: W, height: capH + gap + subCap,
  };
}
