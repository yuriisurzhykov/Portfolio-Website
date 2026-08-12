/**
 * Same lightness/chroma as the site's own brand accent
 * (`palette.accent = oklch(0.72 0.17 45)`, `theme/tokens.ts`) — only the hue
 * varies, so a per-item hue accent (a Work project's or a category's own
 * assigned color, `resolveWorkHue`/`resolvePostHue`, backend) reads as "the
 * same kind of accent, different color," not a visually unrelated system.
 *
 * Deliberately a raw CSS `oklch()` string, NOT `oklchToSrgbHex` (the
 * conversion `frontend/src/shared/lib/seo/og/render.tsx` uses) — that
 * conversion exists only because `next/og`'s satori renderer doesn't
 * understand the `oklch()` color space at all (see that file's own
 * comment). A real browser rendering this site's own pages does, so there
 * is nothing to convert here.
 */
const ACCENT_LIGHTNESS = 0.72;
const ACCENT_CHROMA = 0.17;

/** A CSS color string for `hue` (0-360) at the site's brand accent lightness/chroma — e.g. `accentColorForHue(200)` → `"oklch(0.72 0.17 200)"`. */
export function accentColorForHue(hue: number): string {
    return `oklch(${ ACCENT_LIGHTNESS } ${ ACCENT_CHROMA } ${ hue })`;
}
