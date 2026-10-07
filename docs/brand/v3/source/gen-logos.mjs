import fs from 'node:fs';
import { C, BOX, markInner, markAt, wordmark, svg } from './brand.mjs';
const OUT = process.argv[2];
const w = (n, s) => fs.writeFileSync(`${OUT}/${n}.svg`, s);
const markSvg = (ink, accent, opts) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX.w} ${BOX.h}" width="384" height="384">${markInner(ink, accent, opts)}</svg>\n`;
w('ys-seal-platinum', markSvg(C.platinum, C.gold));
w('ys-seal-ink', markSvg(C.ink, C.gold));
w('ys-seal-mono-platinum', markSvg(C.platinum, C.platinum));
w('ys-seal-mono-ink', markSvg(C.ink, C.ink));
w('ys-open-platinum', markSvg(C.platinum, C.gold, { frame: false }));
w('ys-open-ink', markSvg(C.ink, C.gold, { frame: false }));

const tile = (bg, ink, accent, size = 512, k = 0.56) => { const m = size * k; return svg(size, size, markAt((size - m) / 2, (size - m) / 2, m, ink, accent), bg); };
w('ys-tile-abyss', tile(C.abyss, C.platinum, C.gold));
w('ys-tile-gold', tile(C.gold, C.abyss, C.abyss));

function horizontal(ink, sub, rule) {
  const mh = 96, capH = 17, gapR = 34;
  const tmp = wordmark(0, 0, capH, ink, sub);
  const ruleX = mh + gapR, textX = ruleX + gapR;
  const wm = wordmark(textX, (mh - tmp.height) / 2, capH, ink, sub);
  return svg(Math.ceil(textX + wm.width), mh, markAt(0, 0, mh, ink) + `<rect x="${ruleX}" y="${mh * 0.2}" width="1" height="${mh * 0.6}" fill="${rule}"/>` + wm.body);
}
w('ys-lockup-horizontal-platinum', horizontal(C.platinum, C.haze, C.slate));
w('ys-lockup-horizontal-ink', horizontal(C.ink, '#59616C', '#C9CED4'));

function stacked(ink, sub) {
  const capH = 17, mh = 112, gap = 40;
  const tmp = wordmark(0, 0, capH, ink, sub, true);
  const W = Math.ceil(tmp.width);
  const wm = wordmark(0, mh + gap, capH, ink, sub, true);
  return svg(W, Math.ceil(mh + gap + wm.height), markAt((W - mh) / 2, 0, mh, ink) + wm.body);
}
w('ys-lockup-stacked-platinum', stacked(C.platinum, C.haze));
w('ys-lockup-stacked-ink', stacked(C.ink, '#59616C'));
console.log('logos written');
