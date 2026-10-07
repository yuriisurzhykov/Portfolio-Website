import fs from 'node:fs';
import { C, BOX, markInner, markAt, markWidth, wordmark, svg } from './brand.mjs';
const OUT = process.argv[2];
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.svg')) fs.unlinkSync(`${OUT}/${f}`);
const w = (n, s) => fs.writeFileSync(`${OUT}/${n}.svg`, s);
const markSvg = (ink, accent, opts) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX.w} ${BOX.h}" width="${BOX.w * 4}" height="${BOX.h * 4}">${markInner(ink, accent, opts)}</svg>\n`;
w('ys-mark-platinum', markSvg(C.platinum, C.gold));
w('ys-mark-ink', markSvg(C.ink, C.goldInk));
w('ys-mark-mono-platinum', markSvg(C.platinum, C.platinum));
w('ys-mark-mono-ink', markSvg(C.ink, C.ink));
w('ys-mark-small-platinum', markSvg(C.platinum, C.gold, { weight: 1.6 }));

// Tiles are filled, never outlined: the container is a surface, not a line.
const tile = (bg, ink, accent, size = 512, k = 0.56, weight = 1) => {
  const mh = size * k;
  return svg(size, size, markAt((size - markWidth(mh)) / 2, (size - mh) / 2, mh, ink, accent, { weight }), bg);
};
w('ys-tile-abyss', tile(C.abyss, C.platinum, C.gold));
w('ys-tile-deep', tile('#121821', C.platinum, C.gold));
w('ys-tile-gold', tile(C.gold, C.abyss, C.abyss));
w('ys-favicon', tile('#121821', C.platinum, C.gold, 64, 0.78, 1.8));

function horizontal(ink, sub, rule, accent = C.gold) {
  const mh = 104, capH = 17, gapR = 34, mw = markWidth(mh);
  const tmp = wordmark(0, 0, capH, ink, sub);
  const ruleX = mw + gapR, textX = ruleX + gapR, cy = mh * 40 / 92; // align text to the crossbar
  const wm = wordmark(textX, cy - tmp.height / 2, capH, ink, sub);
  return svg(Math.ceil(textX + wm.width), mh, markAt(0, 0, mh, ink, accent) + wm.body);
}
w('ys-lockup-horizontal-platinum', horizontal(C.platinum, C.haze, C.slate));
w('ys-lockup-horizontal-ink', horizontal(C.ink, '#59616C', '#C9CED4', C.goldInk));

function stacked(ink, sub, accent = C.gold) {
  const capH = 17, mh = 112, gap = 36;
  const tmp = wordmark(0, 0, capH, ink, sub, true);
  const W = Math.ceil(tmp.width);
  const wm = wordmark(0, mh + gap, capH, ink, sub, true);
  return svg(W, Math.ceil(mh + gap + wm.height), markAt((W - markWidth(mh)) / 2, 0, mh, ink, accent) + wm.body);
}
w('ys-lockup-stacked-platinum', stacked(C.platinum, C.haze));
w('ys-lockup-stacked-ink', stacked(C.ink, '#59616C', C.goldInk));
console.log('logos written');
