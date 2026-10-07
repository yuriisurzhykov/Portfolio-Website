import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { C, FONTS, markAt, PIECES, NODE } from './brand.mjs';
const [OUT, TMP, onlyArg] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });

const face = (fam, file, wt) => `@font-face{font-family:'${fam}';src:url('file://${FONTS}/${file}.ttf');font-weight:${wt}}`;
const CSS = [face('Archivo', 'Archivo-300', 300), face('Archivo', 'Archivo-400', 400), face('Archivo', 'Archivo-500', 500),
  face('Archivo X', 'ArchivoX-300', 300), face('Archivo X', 'ArchivoX-500', 500), face('Archivo X', 'ArchivoX-700', 700),
  face('JB', 'JetBrainsMono-400', 400), face('JB', 'JetBrainsMono-500', 500)].join('') +
  `*{box-sizing:border-box;margin:0}body{width:var(--w);height:var(--h);overflow:hidden;font-family:Archivo;position:relative;background:${C.abyss};color:${C.platinum}}
  .x{font-family:'Archivo X'}.mono{font-family:JB;text-transform:uppercase;letter-spacing:.18em}
  .abs{position:absolute}`;

const layer = (w, h, body) => `<svg class="abs" style="inset:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const mark = (x, y, h, ink, node = C.gold) => `<svg class="abs" style="left:0;top:0;overflow:visible" width="1" height="1">${markAt(x, y, h, ink, node)}</svg>`;
// The mark's slot rows (y 46 and 72.5 of 96) extended as hairlines across the canvas.
const slotLines = (x, y, h, w, color, sw = 1) => [46, 72.5].map((v) => `<rect x="0" y="${y + v / 96 * h - sw / 2}" width="${w}" height="${sw}" fill="${color}"/>`).join('');
// Dimension line in drawing convention: ticks at both ends, value centred.
const dim = (x1, x2, y, label, color = C.haze, size = 12) => `<g stroke="${color}" stroke-width="1"><path d="M${x1} ${y}H${x2}M${x1} ${y - 6}V${y + 6}M${x2} ${y - 6}V${y + 6}"/></g>` +
  `<rect x="${(x1 + x2) / 2 - label.length * size * 0.36 - 10}" y="${y - 9}" width="${label.length * size * 0.72 + 20}" height="18" fill="${C.abyss}"/>` +
  `<text x="${(x1 + x2) / 2}" y="${y + 4}" text-anchor="middle" font-family="JB" font-size="${size}" letter-spacing="1.5" fill="${C.haze}">${label}</text>`;
const ghost = '#0F141B';
// The mark as a technical drawing: piece outlines in hairline, dimensioned in drawing convention.
function drawing(x, y, h, { color = '#2A3442', dims = true, node = true, sw = 1.25, label = 12 } = {}) {
  const k = h / 96, P = (pts) => pts.split(' ').map((q) => q.split(',').map(Number)).map(([a, b]) => `${x + a * k},${y + b * k}`).join(' ');
  let g = PIECES.map((pts) => `<polygon points="${P(pts)}" fill="none" stroke="${color}" stroke-width="${sw}"/>`).join('');
  if (node) { const cx = x + NODE.x * k, cy = y + NODE.y * k, r = NODE.r * k * 0.8; g += `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${C.gold}"/>`; }
  if (dims) {
    const off = Math.max(28, h * 0.08);
    g += dimLine(x, x + h, y - off, '96', color, label) + dimLineV(x + h + off, y, y + h, '96', color, label);
        g += `<text x="${x + 28 * k - 10}" y="${y + 47.5 * k}" text-anchor="end" font-family="JB" font-size="${label}" fill="${C.haze}">7</text>` +
      `<text x="${x + 48 * k}" y="${y + 8 * k}" text-anchor="middle" font-family="JB" font-size="${label}" fill="${C.haze}">45°</text>`;
  }
  return g;
}
function dimLine(x1, x2, y, t, color, size) {
  return `<g stroke="${color}"><path d="M${x1} ${y}H${x2}M${x1} ${y - 5}V${y + 5}M${x2} ${y - 5}V${y + 5}"/></g><rect x="${(x1 + x2) / 2 - 18}" y="${y - 9}" width="36" height="18" fill="${C.abyss}"/><text x="${(x1 + x2) / 2}" y="${y + 4}" text-anchor="middle" font-family="JB" font-size="${size}" fill="${C.haze}">${t}</text>`;
}
function dimLineV(x, y1, y2, t, color, size) {
  return `<g stroke="${color}"><path d="M${x} ${y1}V${y2}M${x - 5} ${y1}H${x + 5}M${x - 5} ${y2}H${x + 5}"/></g><rect x="${x - 14}" y="${(y1 + y2) / 2 - 12}" width="28" height="24" fill="${C.abyss}"/><text x="${x}" y="${(y1 + y2) / 2 + 4}" text-anchor="middle" font-family="JB" font-size="${size}" fill="${C.haze}">${t}</text>`;
}

const S = {};
const avatar = (bg, ink, node) => `<body style="background:${bg}">${mark(256, 256, 512, ink, node)}</body>`;
S['avatar-abyss'] = { w: 1024, h: 1024, html: avatar(C.abyss, C.platinum, C.gold) };
S['avatar-gold'] = { w: 1024, h: 1024, html: avatar(C.gold, C.abyss, C.abyss) };

function banner(w, h) {
  const dh = h * 0.56, dx = w - dh - h * 0.36, dy = (h - dh) / 2 + h * 0.03;
  return `<body>${layer(w, h, drawing(dx, dy, dh, { label: Math.round(h * 0.03) }))}
  <div class="abs" style="left:${w * 0.3}px;top:${h * 0.38}px;display:grid;gap:${h * 0.075}px">
    <div class="x" style="font-weight:300;font-size:${h * 0.105}px;letter-spacing:-.01em;line-height:1">Engineered end to end.</div>
    <div class="mono" style="color:${C.haze};font-size:${Math.round(h * 0.03)}px">Android platform · AOSP · Event-driven architecture · Codegen</div>
  </div></body>`;
}
S['linkedin-banner'] = { w: 1584, h: 396, html: banner(1584, 396) };
S['x-header'] = { w: 1500, h: 500, html: banner(1500, 500) };

S['og-image'] = { w: 1200, h: 630, html: `<body>
  ${layer(1200, 630, drawing(902, 250, 210, { label: 11 }) + dim(80, 1120, 560, 'KOTLIN · AOSP · CAMERA2 · KSP · EVENT-DRIVEN ARCHITECTURE', '#2A3442', 12))}
  ${mark(80, 72, 56, C.platinum)}
  <div class="abs x" style="left:164px;top:80px;font-weight:500;font-size:17px;letter-spacing:.16em">YURII SURZHYKOV</div>
  <div class="abs mono" style="left:164px;top:108px;font-size:11px;color:${C.haze}">Android systems engineer</div>
  <div class="abs x" style="left:80px;top:230px;width:900px;font-weight:300;font-size:50px;line-height:1.14;letter-spacing:-.01em">I design the systems other engineers <span style="color:${C.gold}">build on top of.</span></div>
  </body>` };

const cardFront = (w, h) => `<div class="abs" style="inset:0;background:${C.abyss}">${mark((w - h * 0.3) / 2, h * 0.3, h * 0.3, C.platinum)}
  <div class="abs mono" style="left:0;right:0;bottom:${h * 0.11}px;text-align:center;color:${C.haze};font-size:${h * 0.026}px;letter-spacing:.32em">Engineered end to end</div></div>`;
const cardBack = (w, h) => `<div class="abs" style="inset:0;background:${C.abyss};padding:${h * 0.12}px ${w * 0.08}px;display:flex;flex-direction:column;justify-content:space-between">
  <div><div class="x" style="font-weight:500;font-size:${h * 0.05}px;letter-spacing:.16em">YURII SURZHYKOV</div>
  <div class="mono" style="margin-top:${h * 0.035}px;font-size:${h * 0.028}px;color:${C.haze}">Android systems engineer</div></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
  <div style="font-family:JB;font-size:${h * 0.03}px;line-height:1.95;color:${C.platinum}">yuriisurzhykov@gmail.com<br>github.com/yuriisurzhykov<br>linkedin.com/in/yuriisurzhykov</div>
  <svg width="${h * 0.13}" height="${h * 0.13}">${markAt(0, 0, h * 0.13, C.platinum)}</svg></div></div>`;
S['card-front'] = { w: 1050, h: 600, html: `<body>${cardFront(1050, 600)}</body>` };
S['card-back'] = { w: 1050, h: 600, html: `<body>${cardBack(1050, 600)}</body>` };
// Gilded edge: a 2px gold line on the card's edge, the one place gold meets paper.
const card = (l, t, rot, inner) => `<div class="abs" style="left:${l}px;top:${t}px;width:700px;height:400px;transform:rotate(${rot}deg);border-radius:5px;overflow:hidden;
  box-shadow:2px 3px 0 0 ${C.gold},0 3px 4px rgba(0,0,0,.6),0 40px 80px rgba(0,0,0,.65),0 80px 160px rgba(0,0,0,.45)">${inner}
  <div class="abs" style="inset:0;background:linear-gradient(120deg,rgba(255,255,255,.06),rgba(255,255,255,0) 45%)"></div></div>`;
S['card-mockup'] = { w: 1800, h: 1200, html: `<body style="background:radial-gradient(90% 80% at 40% 30%, #1C2430 0%, #0E1218 60%, #06080B 100%)">
  ${card(240, 230, -7, cardBack(700, 400))}${card(880, 600, 4, cardFront(700, 400))}</body>` };

S['slide-title'] = { w: 1920, h: 1080, html: `<body>
  ${layer(1920, 1080, drawing(1420, 380, 300, { label: 14 }) + dim(120, 1800, 900, 'ADR-014 · 24 SLIDES · 40 MIN', '#2A3442', 14))}
  ${mark(120, 104, 64, C.platinum)}
  <div class="abs mono" style="right:120px;top:124px;font-size:16px;color:${C.haze}">Architecture review · 2026</div>
  <div class="abs mono" style="left:120px;top:340px;font-size:18px;color:${C.gold}">ADR-014 · Navigation</div>
  <div class="abs x" style="left:120px;top:392px;width:1300px;font-size:76px;font-weight:300;line-height:1.08;letter-spacing:-.015em">A navigation engine that owns its own rendering</div>
  <div class="abs mono" style="left:120px;bottom:100px;font-size:14px;color:${C.haze}">Yurii Surzhykov</div>
  <div class="abs mono" style="right:120px;bottom:100px;font-size:14px;color:${C.haze}">01 / 24</div></body>` };

S['post-journal'] = { w: 1080, h: 1350, html: `<body style="padding:96px">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div style="font-family:JB;font-size:20px;color:${C.haze};letter-spacing:.06em"><span style="color:${C.gold}">commit</span> 7ff1154</div>
    <svg width="48" height="48">${markAt(0, 0, 48, C.platinum)}</svg></div>
  <div style="height:1px;background:${C.slate};margin:56px 0 72px"></div>
  <div style="font-family:JB;font-size:20px;color:${C.haze}">refactor(camera):</div>
  <div class="x" style="margin-top:28px;font-size:66px;font-weight:300;line-height:1.12;letter-spacing:-.015em">Move frame timing out of the UI thread. <span style="color:${C.gold}">Nothing else.</span></div>
  <div style="margin-top:52px;max-width:780px;font-size:28px;line-height:1.5;color:${C.haze}">Jank came from one place: capture callbacks sharing a looper with layout. One handler thread, one queue, measured before and after.</div>
  <div class="abs" style="left:96px;right:96px;bottom:96px;display:grid;gap:22px">
    <div class="mono" style="display:flex;justify-content:space-between;font-size:17px;color:${C.haze}"><span>p95 frame time</span><span style="color:${C.platinum}">31.4 ms → 9.8 ms</span></div>
    <div style="height:1px;background:${C.slate}"></div>
    <div class="mono" style="display:grid;grid-template-columns:120px 1fr;align-items:center;gap:22px 24px;font-size:15px;color:${C.haze}">
      <span>before</span><div style="height:12px;width:100%;background:${C.slate}"></div>
      <span>after</span><div style="height:12px;width:31.2%;background:${C.platinum};position:relative"><span style="position:absolute;right:-7px;top:-1px;width:14px;height:14px;transform:rotate(45deg) scale(.72);background:${C.gold}"></span></div>
    </div></div></body>` };

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const only = onlyArg?.split(',');
for (const [name, s] of Object.entries(S)) {
  if (only && !only.includes(name)) continue;
  const file = `${TMP}/${name}.html`;
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>:root{--w:${s.w}px;--h:${s.h}px}${CSS}</style>${s.html}`);
  const p = await b.newPage({ viewport: { width: s.w, height: s.h } });
  await p.goto('file://' + file); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/${name}.png` }); await p.close();
  console.log('rendered', name);
}
await b.close();
