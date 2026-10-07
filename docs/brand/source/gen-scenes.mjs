import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { C, FONTS, markAt, markWidth } from './brand.mjs';
const OUT = process.argv[2];
const TMP = process.argv[3];
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });

const face = (fam, file, wt, st = 'normal') => `@font-face{font-family:'${fam}';src:url('file://${FONTS}/${file}.ttf');font-weight:${wt};font-style:${st}}`;
const CSS = [face('Geist', 'Geist-300', 300), face('Geist', 'Geist-400', 400), face('Geist', 'Geist-500', 500), face('Geist', 'Geist-600', 600),
  face('Geist Mono', 'GeistMono-400', 400), face('Geist Mono', 'GeistMono-500', 500),
  face('Instrument Serif', 'InstrumentSerif', 400), face('Instrument Serif', 'InstrumentSerif-Italic', 400, 'italic')].join('') +
  `*{box-sizing:border-box;margin:0}body{width:var(--w);height:var(--h);overflow:hidden;font-family:Geist}
  .mono{font-family:'Geist Mono';text-transform:uppercase;letter-spacing:.2em}
  .serif{font-family:'Instrument Serif';font-weight:400}`;

// Polyline with filleted corners (quadratic approximation, fine at hairline weights).
function route(pts, r) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy);
    const t1 = Math.min(r, l1 / 2), t2 = Math.min(r, l2 / 2);
    d += `L${cx - (cx - px) / l1 * t1} ${cy - (cy - py) / l1 * t1}Q${cx} ${cy} ${cx + (nx - cx) / l2 * t2} ${cy + (ny - cy) / l2 * t2}`;
  }
  const l = pts.at(-1); return d + `L${l[0]} ${l[1]}`;
}
// A bus of parallel traces: concentric strokes alternating line and ground colour.
function bus(d, n, gap, line, ground, sw = 1.25) {
  let s = '';
  for (let k = n; k >= 1; k--) {
    const w = (k - 0.5) * 2 * gap;
    s += `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w + sw}" stroke-linejoin="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${ground}" stroke-width="${w - sw}" stroke-linejoin="round"/>`;
  }
  return s;
}
const trace = (d, color, sw = 1.5) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
const node = (x, y, r = 5, c = C.amber) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const svgLayer = (w, h, body) => `<svg style="position:absolute;inset:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const mark = (x, y, h, ink, n = C.amber) => `<svg style="position:absolute;left:0;top:0;overflow:visible" width="1" height="1">${markAt(x, y, h, ink, n)}</svg>`;

const scenes = {};

scenes['avatar-graphite'] = { w: 1024, h: 1024, html: (() => {
  const mh = 560, mw = markWidth(mh);
  return `<body style="background:${C.graphite}">${mark((1024 - mw) / 2, (1024 - mh) / 2, mh, C.paper)}</body>`; })() };
scenes['avatar-paper'] = { w: 1024, h: 1024, html: (() => {
  const mh = 560, mw = markWidth(mh);
  return `<body style="background:${C.paper}">${mark((1024 - mw) / 2, (1024 - mh) / 2, mh, C.graphite)}</body>`; })() };

function banner(w, h, textRight) {
  const top = h * 0.2, low = h * 0.8, x1 = w * 0.16;
  const d = route([[-40, low], [x1, low], [x1 + (low - top), top], [w + 40, top]], 30);
  const ny = h * 0.56, nx = textRight - 640;
  const a = route([[x1 + (low - top) * 0.62 + 120, h + 20], [x1 + (low - top) * 0.62 + 120, ny + 40], [x1 + (low - top) * 0.62 + 160, ny], [nx, ny]], 24);
  return `<body style="background:${C.graphite};position:relative">
  ${svgLayer(w, h, bus(d, 4, 9, C.iron, C.graphite) + trace(a, C.amber, 1.5) + node(nx, ny, 4.5))}
  <div style="position:absolute;right:${w - textRight}px;top:${h * 0.42}px;display:flex;flex-direction:column;align-items:flex-end;gap:${h * 0.07}px;text-align:right">
    <div class="serif" style="color:${C.paper};font-size:${h * 0.19}px;line-height:.8;letter-spacing:-.01em">Engineered <i>end to end.</i></div>
    <div class="mono" style="color:${C.alloy};font-size:${Math.round(h * 0.034)}px">Android platform · AOSP · Event-driven architecture · Codegen</div>
  </div></body>`;
}
scenes['linkedin-banner'] = { w: 1584, h: 396, html: banner(1584, 396, 1584 - 96) };
scenes['x-header'] = { w: 1500, h: 500, html: banner(1500, 500, 1500 - 90) };

scenes['og-image'] = { w: 1200, h: 630, html: (() => {
  const d = route([[1240, 440], [1010, 440], [800, 650], [780, 670]], 26);
  return `<body style="background:${C.paper};position:relative">
  ${svgLayer(1200, 630, bus(d, 3, 9, C.mist, C.paper))}
  ${mark(80, 72, 64, C.graphite)}
  <div class="mono" style="position:absolute;left:146px;top:94px;font-size:15px;color:${C.graphite};letter-spacing:.24em">Yurii Surzhykov</div>
  <div class="mono" style="position:absolute;left:146px;top:118px;font-size:12px;color:${C.steel}">Android systems engineer</div>
  <div class="serif" style="position:absolute;left:80px;top:210px;width:860px;font-size:64px;line-height:1.04;color:${C.graphite};letter-spacing:-.01em">I design the systems other engineers <i>build on top of.</i></div>
  <div class="mono" style="position:absolute;left:80px;bottom:72px;font-size:13px;color:${C.steel}">Kotlin · AOSP · Camera2 · KSP · Event-driven architecture</div>
  </body>`; })() };

const cardFront = (w, h) => { const mh = h * 0.34;
  return `<div style="position:absolute;inset:0;background:${C.graphite}">${mark((w - markWidth(mh)) / 2, (h - mh) / 2, mh, C.paper)}
  <div class="mono" style="position:absolute;left:0;right:0;bottom:${h * 0.09}px;text-align:center;color:${C.alloy};font-size:${h * 0.026}px;letter-spacing:.3em">Engineered end to end</div></div>`; };
const cardBack = (w, h) => `<div style="position:absolute;inset:0;background:${C.paper};padding:${h * 0.11}px ${w * 0.075}px;display:flex;flex-direction:column;justify-content:space-between">
  <div><div style="font-weight:500;font-size:${h * 0.058}px;letter-spacing:.2em;color:${C.graphite}">YURII SURZHYKOV</div>
  <div class="mono" style="margin-top:${h * 0.03}px;font-size:${h * 0.03}px;color:${C.steel}">Android systems engineer</div></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
  <div class="mono" style="font-size:${h * 0.03}px;line-height:1.9;color:${C.graphite};letter-spacing:.08em;text-transform:none">yuriisurzhykov@gmail.com<br>github.com/yuriisurzhykov<br>linkedin.com/in/yuriisurzhykov</div>
  <svg width="${h * 0.12}" height="${h * 0.12}" style="overflow:visible">${markAt(h * 0.12 - markWidth(h * 0.17), -h * 0.05, h * 0.17, C.graphite)}</svg></div></div>`;
scenes['card-front'] = { w: 1050, h: 600, html: `<body style="position:relative">${cardFront(1050, 600)}</body>` };
scenes['card-back'] = { w: 1050, h: 600, html: `<body style="position:relative">${cardBack(1050, 600)}</body>` };
scenes['card-mockup'] = { w: 1800, h: 1200, html: `<body style="position:relative;background:radial-gradient(120% 90% at 30% 20%, #2a2c31 0%, #17181b 55%, #0e0f11 100%)">
  <div style="position:absolute;left:250px;top:250px;width:700px;height:400px;transform:rotate(-8deg);border-radius:6px;overflow:hidden;box-shadow:0 2px 3px rgba(0,0,0,.5),0 30px 60px rgba(0,0,0,.55),0 60px 120px rgba(0,0,0,.35)">${cardBack(700, 400)}</div>
  <div style="position:absolute;left:900px;top:620px;width:700px;height:400px;transform:rotate(5deg);border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.06),0 2px 3px rgba(0,0,0,.6),0 34px 70px rgba(0,0,0,.6),0 70px 140px rgba(0,0,0,.4)">${cardFront(700, 400)}
    <div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.07),rgba(255,255,255,0) 40%)"></div></div>
  </body>` };

scenes['slide-title'] = { w: 1920, h: 1080, html: (() => {
  const d = route([[-40, 900], [1100, 900], [1260, 740], [1960, 740]], 40);
  const a = route([[1960, 812], [1330, 812], [1290, 852], [1290, 900]], 30);
  return `<body style="background:${C.graphite};position:relative">
  ${svgLayer(1920, 1080, bus(d, 4, 11, C.iron, C.graphite, 1.5) + trace(a, C.amber, 2) + node(1290, 900, 7))}
  ${mark(120, 104, 72, C.paper)}
  <div class="mono" style="position:absolute;right:120px;top:126px;font-size:18px;color:${C.alloy}">Architecture review · 2026</div>
  <div class="mono" style="position:absolute;left:120px;top:330px;font-size:20px;color:${C.amber}">ADR-014 · Navigation</div>
  <div style="position:absolute;left:120px;top:380px;width:1300px;font-size:96px;font-weight:300;line-height:1.04;letter-spacing:-.025em;color:${C.paper}">A navigation engine that owns its own rendering</div>
  <div class="mono" style="position:absolute;left:120px;bottom:110px;font-size:16px;color:${C.alloy}">Yurii Surzhykov</div>
  <div class="mono" style="position:absolute;right:120px;bottom:110px;font-size:16px;color:${C.alloy}">01 / 24</div>
  </body>`; })() };

scenes['post-journal'] = { w: 1080, h: 1350, html: `<body style="background:${C.paper};position:relative;padding:96px">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div class="mono" style="font-size:20px;color:${C.steel};letter-spacing:.12em"><span style="color:${C.amberInk}">commit</span> <span style="text-transform:none">7ff1154</span></div>
    <svg width="40" height="58" style="overflow:visible">${markAt(0, 0, 58, C.graphite)}</svg></div>
  <div style="height:1px;background:${C.mist};margin:56px 0 72px"></div>
  <div class="mono" style="font-size:20px;color:${C.steel};text-transform:none;letter-spacing:.06em">refactor(camera):</div>
  <div class="serif" style="margin-top:28px;font-size:92px;line-height:1.02;color:${C.graphite};letter-spacing:-.01em">Move frame timing out of the UI thread. <i>Nothing else.</i></div>
  <div style="margin-top:56px;max-width:760px;font-size:28px;line-height:1.5;color:${C.steel}">Jank came from one place: capture callbacks sharing a looper with layout. One handler thread, one queue, measured before and after.</div>
  <div style="position:absolute;left:96px;right:96px;bottom:96px;display:grid;gap:22px">
    <div class="mono" style="display:flex;justify-content:space-between;font-size:18px;color:${C.steel}"><span>p95 frame time</span><span style="color:${C.graphite}">31.4 ms → 9.8 ms</span></div>
    <div style="height:1px;background:${C.mist}"></div>
    <div class="mono" style="display:grid;grid-template-columns:120px 1fr;align-items:center;gap:22px 24px;font-size:16px;color:${C.steel}">
      <span>before</span><div style="height:14px;width:100%;background:${C.mist}"></div>
      <span>after</span><div style="height:14px;width:31.2%;background:${C.graphite};position:relative"><span style="position:absolute;right:-5px;top:2px;width:10px;height:10px;border-radius:50%;background:${C.amber}"></span></div>
    </div></div>
  </body>` };

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const only = process.argv[4]?.split(',');
for (const [name, s] of Object.entries(scenes)) {
  if (only && !only.includes(name)) continue;
  const file = `${TMP}/${name}.html`;
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>:root{--w:${s.w}px;--h:${s.h}px}${CSS}</style>${s.html}`);
  const p = await b.newPage({ viewport: { width: s.w, height: s.h } });
  await p.goto('file://' + file); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/${name}.png` }); await p.close();
  console.log('rendered', name);
}
await b.close();
