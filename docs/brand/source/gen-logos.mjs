import fs from 'node:fs';
import { C, BOX, markInner, markAt, markWidth, wordmark, svg } from './brand.mjs';
const OUT = process.argv[2];
const w = (n, s) => fs.writeFileSync(`${OUT}/${n}.svg`, s);
const markSvg = (ink, node) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}" width="${BOX.w * 4}" height="${BOX.h * 4}">${markInner(ink, node)}</svg>\n`;
w('ys-mark-graphite', markSvg(C.graphite, C.amber));
w('ys-mark-paper', markSvg(C.paper, C.amber));
w('ys-mark-mono-graphite', markSvg(C.graphite, C.graphite));
w('ys-mark-mono-paper', markSvg(C.paper, C.paper));

// App icon / avatar tile: mark centred optically (node sits on the vertical axis).
function tile(bg, ink, size = 512, h = 0.56) {
  const mh = size * h, mw = markWidth(mh);
  return svg(size, size, markAt((size - mw) / 2, (size - mh) / 2, mh, ink), bg);
}
w('ys-tile-graphite', tile(C.graphite, C.paper));
w('ys-tile-paper', tile(C.paper, C.graphite));

function horizontal(ink, sub, rule) {
  const mh = 120, mw = markWidth(mh), pad = 0;
  const capH = 19;
  const wmTmp = wordmark(0, 0, capH, ink, sub);
  const ruleX = mw + 36, textX = ruleX + 36;
  const ty = (mh - wmTmp.height) / 2;
  const wm = wordmark(textX, ty, capH, ink, sub);
  const W = Math.ceil(textX + wm.width), H = mh;
  return svg(W, H, markAt(pad, 0, mh, ink) + `<rect x="${ruleX}" y="${mh * 0.18}" width="1" height="${mh * 0.64}" fill="${rule}"/>` + wm.body);
}
w('ys-lockup-horizontal-graphite', horizontal(C.graphite, C.steel, C.mist));
w('ys-lockup-horizontal-paper', horizontal(C.paper, C.alloy, C.iron));

function stacked(ink, sub) {
  const capH = 19;
  const tmp = wordmark(0, 0, capH, ink, sub);
  const W = Math.ceil(tmp.width), mh = 132, mw = markWidth(mh);
  const wm = wordmark(0, mh + 44, capH, ink, sub, true);
  // centre each line of the wordmark independently is not possible from paths alone; name is the widest line
  return svg(W, Math.ceil(mh + 44 + wm.height), markAt((W - mw) / 2, 0, mh, ink) + wm.body);
}
w('ys-lockup-stacked-graphite', stacked(C.graphite, C.steel));
w('ys-lockup-stacked-paper', stacked(C.paper, C.alloy));
console.log('logos written');
