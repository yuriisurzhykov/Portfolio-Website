/**
 * CONTRAST REPORT — WCAG 2 vs APCA
 * ---------------------------------------------------------------------------
 * One-off analysis script (not part of the app or the test suite) that answers a concrete
 * question raised while discussing this repo's accessibility approach: our automated a11y gate
 * (`tests/e2e/a11y.spec.ts`, via `axe-core`'s `color-contrast` rule) checks WCAG 2's relative-
 * luminance ratio. Our actual design tokens (`shared/ui/theme/tokens.ts`) were also *tuned*
 * against that same WCAG ratio — see the "WCAG AA fix" / "REVERTED" comments there and
 * `tests/README.md` section 11's "accent/status color fix" story (three attempts, two rejected
 * for looking "muddy").
 *
 * This script re-runs the same color pairs through APCA (Advanced Perceptual Contrast
 * Algorithm — the candidate replacement in the WCAG 3 draft) to see where the two algorithms
 * actually disagree, using our own real palette values instead of a generic example.
 *
 * Run with: `npx tsx scripts/contrast-report.ts` (from `frontend/`).
 *
 * Not wired into `npm run test:a11y` or CI — this is an exploratory report, not a gate. APCA is
 * still a WCAG 3 *draft* method (thresholds have changed between spec revisions, and there is no
 * finalized, legally-referenced "AA" line for it yet the way there is for WCAG 2.1 AA's 4.5:1),
 * so it isn't a drop-in replacement for the compliance-facing `axe-core` scan today.
 */
import { APCAcontrast, fontLookupAPCA, sRGBtoY } from "apca-w3";
import { converter, parse } from "culori";

const toRgb = converter("rgb");

type Rgb255 = [number, number, number];

/** Parses any CSS color this codebase's tokens actually use (hex, oklch()) into 8bpc sRGB. */
function toSrgb255(css: string): Rgb255 {
    const parsed = parse(css);
    if (!parsed) throw new Error(`Could not parse color: ${ css }`);
    const rgb = toRgb(parsed);
    const clamp255 = (channel: number | undefined) => Math.round(Math.max(0, Math.min(1, channel ?? 0)) * 255);
    return [clamp255(rgb.r), clamp255(rgb.g), clamp255(rgb.b)];
}

/** WCAG 2 contrast ratio — the exact formula `axe-core`'s `color-contrast` rule implements. */
function wcagRatio(fg: Rgb255, bg: Rgb255): number {
    const relativeLuminance = ([r, g, b]: Rgb255): number => {
        const linearize = (channel: number) => {
            const c = channel / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        const [rl, gl, bl] = [linearize(r), linearize(g), linearize(b)];
        return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
    };
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (lighter + 0.05) / (darker + 0.05);
}

/** APCA Lc — signed (sign encodes polarity: text-on-dark vs text-on-light). */
function apcaLc(fg: Rgb255, bg: Rgb255): number {
    return APCAcontrast(sRGBtoY(fg), sRGBtoY(bg)) as number;
}

interface Pair {
    label: string;
    theme: "dark" | "light";
    fg: string;
    bg: string;
    role: string;
}

// Real token values from shared/ui/theme/tokens.ts, as literal CSS strings (kept independent of
// the actual module so this script can also evaluate values that no longer exist in tokens.ts —
// e.g. the rejected "muddy" attempt below — side by side with what shipped).
const pairs: Pair[] = [
    // ---- Body/UI text against the page background — the "faint label" violations from
    // README.md section 11's very first finding ----
    { label: "text.primary on bg.app", theme: "dark", fg: "#f5f3f0", bg: "#0b0b0d", role: "body text" },
    { label: "text.secondary on bg.app", theme: "dark", fg: "#b3b0ab", bg: "#0b0b0d", role: "body text" },
    { label: "text.muted on bg.app", theme: "dark", fg: "#8a877f", bg: "#0b0b0d", role: "small/caption" },
    { label: "text.faint (dim, CURRENT) on bg.app", theme: "dark", fg: "#938e83", bg: "#0b0b0d", role: "small/caption" },
    { label: "text.faint (dim, ORIGINAL pre-fix) on bg.app", theme: "dark", fg: "#57544d", bg: "#0b0b0d", role: "small/caption" },

    { label: "text.primary on bg.app", theme: "light", fg: "#181614", bg: "#f7f5f0", role: "body text" },
    { label: "text.secondary on bg.app", theme: "light", fg: "#4a4744", bg: "#f7f5f0", role: "body text" },
    { label: "text.muted on bg.app", theme: "light", fg: "#6b6862", bg: "#f7f5f0", role: "small/caption" },
    { label: "text.faint (dim, CURRENT) on bg.app", theme: "light", fg: "#6b6760", bg: "#f7f5f0", role: "small/caption" },
    { label: "text.faint (dim, ORIGINAL pre-fix) on bg.app", theme: "light", fg: "#948f86", bg: "#f7f5f0", role: "small/caption" },

    // ---- The open question: `.text-accent-solid` (vibrant brand orange used as literal text/
    // icon color — TechStack hover state, DesignSystemPlayground demo, tint-panel borders read as
    // text-ish accents) — kept vibrant on BOTH themes today; axe flags this on light theme ----
    { label: "accent.solid (vibrant orange) AS TEXT on bg.app", theme: "dark", fg: "oklch(0.72 0.17 45)", bg: "#0b0b0d", role: "icon/inline, large" },
    { label: "accent.solid (vibrant orange) AS TEXT on card", theme: "dark", fg: "oklch(0.72 0.17 45)", bg: "#111113", role: "icon/inline, large" },
    { label: "accent.solid (vibrant orange) AS TEXT on bg.app", theme: "light", fg: "oklch(0.72 0.17 45)", bg: "#f7f5f0", role: "icon/inline, large" },
    { label: "accent.solid (vibrant orange) AS TEXT on card", theme: "light", fg: "oklch(0.72 0.17 45)", bg: "#ffffff", role: "icon/inline, large" },

    // ---- accent.text — the "Attempt 3" fix actually shipped for plain inline accent text
    // (links, Eyebrow labels) on light theme, once accent.solid itself failed there ----
    { label: "accent.text (accepted fix, #be3500) on bg.app", theme: "light", fg: "#be3500", bg: "#f7f5f0", role: "inline link/label" },
    { label: "accent.text (accepted fix, #be3500) on card", theme: "light", fg: "#be3500", bg: "#ffffff", role: "inline link/label" },

    // ---- Attempt 1 — REJECTED for looking "muddy/brown" (README.md section 11). Colors no
    // longer exist in tokens.ts; reconstructed here from the README's own numbers for direct
    // comparison against the vibrant originals above. ----
    { label: "REJECTED muddy accent (#ab5327) on bg.app", theme: "light", fg: "#ab5327", bg: "#f7f5f0", role: "icon/inline, large" },
    { label: "REJECTED muddy statusGreen (#40724a) on bg.app", theme: "light", fg: "#40724a", bg: "#f7f5f0", role: "icon/inline, large" },
    { label: "REJECTED muddy statusAmber (#806230) on bg.app", theme: "light", fg: "#806230", bg: "#f7f5f0", role: "icon/inline, large" },

    // ---- Attempt 2 — accepted: dark ink drawn ON TOP of the still-vibrant solid fills
    // (StatusBadge / primary Button). Same ink value on both themes. ----
    { label: "accent.onSolid (dark ink) on accent.solid fill", theme: "dark", fg: "#0b0b0d", bg: "oklch(0.72 0.17 45)", role: "button/badge text" },
    { label: "status.onSolid (dark ink) on statusGreen fill", theme: "dark", fg: "#0b0b0d", bg: "#7fd88f", role: "badge text" },
    { label: "status.onSolid (dark ink) on statusAmber fill", theme: "dark", fg: "#0b0b0d", bg: "#e8b45e", role: "badge text" },
];

function fmtRatio(r: number): string {
    return `${ r.toFixed(2) }:1`;
}

function fmtLc(lc: number): string {
    return lc.toFixed(1);
}

/**
 * APCA's own minimum-font-size guidance table for a given |Lc|. `fontLookupAPCA` returns
 * `[lcLabel, size@w100, size@w200, ..., size@w900]` — see apca-w3's own `weightArray`
 * (`[0,100,200,...,900]`); index 4 is weight 400 (regular), index 7 is weight 700 (bold).
 * A value of `999`/`777` means "unusable at any/most sizes at this weight", per the library.
 */
function minFontSizesFor(lc: number): string {
    const row = fontLookupAPCA(Math.abs(lc)) as Array<number | string>;
    const describe = (index: number, label: string) => {
        const value = Number(row[index]);
        if (value === 999) return `${ label }: unusable`;
        if (value === 777) return `${ label }: non-text only`;
        return `${ label } ≥${ value }px`;
    };
    return `${ describe(4, "regular") }, ${ describe(7, "bold") }`;
}

console.log("=".repeat(120));
console.log("WCAG 2 contrast ratio vs APCA Lc — real pairs from this repo's design tokens");
console.log("WCAG 2.1 AA thresholds:  4.5:1 normal text  /  3:1 large (≥24px or ≥19px bold) text");
console.log("APCA guidance:           Lc 75 body text  /  Lc 60 large text  /  Lc 45 large bold — no official legal threshold yet (WCAG 3 draft)");
console.log("=".repeat(120));

for (const pair of pairs) {
    const fg = toSrgb255(pair.fg);
    const bg = toSrgb255(pair.bg);
    const ratio = wcagRatio(fg, bg);
    const lc = apcaLc(fg, bg);

    const wcagNormalPass = ratio >= 4.5 ? "PASS" : "FAIL";
    const wcagLargePass = ratio >= 3.0 ? "PASS" : "FAIL";
    // APCA polarity: sign tells you fg-darker-than-bg vs fg-lighter-than-bg; magnitude is what
    // matters for the pass/fail comparison against the (still-informal) guidance numbers above.
    const apcaBodyPass = Math.abs(lc) >= 75 ? "PASS" : "FAIL";
    const apcaLargeBoldPass = Math.abs(lc) >= 45 ? "PASS" : "FAIL";

    console.log(`\n[${ pair.theme.toUpperCase() }] ${ pair.label }  (role: ${ pair.role })`);
    console.log(`  fg=${ pair.fg } -> rgb(${ fg.join(",") })   bg=${ pair.bg } -> rgb(${ bg.join(",") })`);
    console.log(`  WCAG ratio: ${ fmtRatio(ratio) }   [normal text: ${ wcagNormalPass }]  [large/bold text: ${ wcagLargePass }]`);
    console.log(`  APCA Lc:    ${ fmtLc(lc) }   [body text (Lc75): ${ apcaBodyPass }]  [large/bold (Lc45): ${ apcaLargeBoldPass }]`);
    console.log(`  APCA min font size at this Lc — ${ minFontSizesFor(lc) }`);
}

console.log(`\n${ "=".repeat(120) }`);
console.log("Read: any row where the two PASS/FAIL columns disagree is exactly the kind of case the");
console.log("article was pointing at — WCAG and APCA are not just two units for the same fact.");
