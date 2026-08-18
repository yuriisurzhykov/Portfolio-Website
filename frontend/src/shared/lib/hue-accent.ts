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
/**
 * Exported (not module-private) specifically so `shared/lib/seo/og/render.tsx`
 * can share this exact source instead of hand-copying the same two numbers —
 * a real, found-live duplication this design-token migration's audit
 * flagged: two independent copies of "the brand accent's OKLCH lightness/
 * chroma," silently able to drift apart. Deliberately still not derived
 * from `theme/tokens/color.ts`'s `brand.500` (an `hsl()` string) — that
 * would need a real HSL→OKLCH conversion, a separate, legitimate follow-up
 * (see this file's own module doc comment), not invented here.
 */
export const ACCENT_LIGHTNESS = 0.72;
export const ACCENT_CHROMA = 0.17;

/**
 * A CSS color string for `hue` (0-360) at the site's brand accent
 * lightness/chroma — e.g. `accentColorForHue(200)` → `"oklch(0.72 0.17 200)"`.
 *
 * @remarks Background-fill use only (a pill/badge with fixed ink text on
 * top, e.g. `StatusBadge`'s `text-accent-on-solid`) — never as a text
 * color directly on the page background. A real a11y test caught this:
 * this lightness reads at only ~2.1-2.5:1 contrast as TEXT against light
 * theme's background for every hue, never just the two a given run
 * happens to seed (`lightPalette.accentText` in `theme/tokens.ts` is a
 * hand-darkened value that only works for ONE fixed hue, which arbitrary
 * per-item hues can't reuse) — see frontend/README.md's dated entry.
 */
export function accentColorForHue(hue: number): string {
    return `oklch(${ ACCENT_LIGHTNESS } ${ ACCENT_CHROMA } ${ hue })`;
}
