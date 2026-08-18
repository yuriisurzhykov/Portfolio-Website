import { ImageResponse } from "next/og";
import { oklchToSrgbHex } from "@portfolio/backend";
import { ACCENT_CHROMA, ACCENT_LIGHTNESS } from "@/shared/lib/hue-accent";
import { ogTheme } from "@/shared/ui/theme/adapters";
import { ogFonts } from "./fonts";

/**
 * The hue every caller with no real item to resolve one from falls back
 * to — today, only the site-default card (no post/work item at all, e.g.
 * a database outage degraded `journal/[slug]/og-image`'s own item lookup
 * to `null`). Picked to land close to the original hardcoded `#e8743a`
 * accent this replaced. `Work` items used to fall back to this too,
 * before `resolveWorkHue` (2026-08-11, Work Item Covers & Unified
 * Identity Hue) gave every project its own real, guaranteed-unique hue —
 * see this file's own `OgCardProps.hue` comment.
 */
const DEFAULT_HUE = 45;

/**
 * Background mesh-gradient tuning — deliberately DARKER and lower-alpha
 * than the procedural post cover's own palette (`cover-palette.ts`'s
 * `SPOT_LIGHTNESS`/`SPOT_CHROMA`): this background sits behind real text
 * across the ENTIRE card, not just in an empty corner, so contrast against
 * `ogTheme.textPrimary`/`textSecondary` has to hold up everywhere at once.
 */
const BG_SPOT_LIGHTNESS = 0.55;
const BG_SPOT_CHROMA = 0.14;
const BG_SPOT_ALPHA = 0.32;
/** Fixed, not per-post-seeded — an OG card has no `variant`/reroll concept, and "the same category always gives the same card" is the point (see `OgCardProps.hue`'s own comment). */
const BG_SPOT_HUE_OFFSETS = [0, 38, -38];
const BG_SPOT_POSITIONS = ["12% 8%", "92% 18%", "55% 105%"];

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${ r }, ${ g }, ${ b }, ${ alpha })`;
}

/**
 * A soft, three-spot mesh gradient from `hue` — the same OKLCH-authored,
 * gamut-clipped-to-sRGB technique the procedural post cover uses, tuned
 * down for text legibility (see this file's own constants above).
 *
 * **Found live, not assumed: satori does not support the CSS `inset`
 * shorthand.** An earlier version of this background positioned itself
 * with `inset: 0` and rendered as a perfectly flat, ungradiented card —
 * no error, no warning, just silently zero-sized. Every absolutely
 * positioned layer in `renderOgImage` below sets explicit
 * `top`/`left`/`width`/`height` instead, which is what actually renders.
 */
function meshBackgroundImage(hue: number): string {
    return BG_SPOT_HUE_OFFSETS
        .map((offset, index) => {
            const color = oklchToSrgbHex(BG_SPOT_LIGHTNESS, BG_SPOT_CHROMA, hue + offset);
            return `radial-gradient(circle at ${ BG_SPOT_POSITIONS[index] }, ${ hexToRgba(color, BG_SPOT_ALPHA) } 0%, transparent 55%)`;
        })
        .join(", ");
}

/** Open Graph's canonical size. Google recommends three aspect ratios for `Article` images; one 1200×630 is a deliberate simplification — this is a link preview, not a Discover carousel bid. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export interface OgCardProps {
    /** Small label above the title — the section this page belongs to. */
    eyebrow: string;
    title: string;
    /** One supporting line. Trimmed by the caller, not here — this component draws what it is given. */
    subtitle: string;
    /** Bottom-left signature, the site owner's name. */
    footer: string;
    /**
     * Degrees, 0-360 — drives BOTH the eyebrow's accent colour and the
     * background mesh gradient, via the same gamut-clipping OKLCH-to-sRGB
     * conversion the procedural post cover uses.
     * `journal/[slug]/og-image/[locale]/route.ts` passes the post's own
     * resolved hue (`resolvePostHue` — the linked Work's hue when one
     * exists, the category's hue otherwise); `work/[slug]/og-image/[locale]/route.ts`
     * passes the project's own guaranteed-unique hue (`resolveWorkHue`,
     * added 2026-08-11, Work Item Covers & Unified Identity Hue). Either
     * way, a reader who has seen an item's card/cover and then its OG
     * preview sees the same colour family tie them together. Only the
     * site-default card (no real item resolved at all) falls back to
     * `DEFAULT_HUE`.
     */
    hue?: number;
}

/**
 * One template, three entry points (`journal/[slug]`, `work/[slug]`, and
 * the site default). Rendered by satori, so only the subset of CSS satori
 * implements is available — flexbox, no `gap` shorthand surprises, no
 * `inset` shorthand (see `meshBackgroundImage`'s own comment), and every
 * element with more than one child needs an explicit `display`.
 *
 * STRICTLY DETERMINISTIC: no dates, no counters, no random values. Two
 * renders of the same page must be byte-identical, or the screenshot
 * baseline in `tests/e2e/og-image.spec.ts` is worthless — the same rule the
 * design-system playground's demo sections follow.
 */
export function renderOgImage({ eyebrow, title, subtitle, footer, hue = DEFAULT_HUE }: OgCardProps): Promise<ImageResponse> {
    const accent = oklchToSrgbHex(ACCENT_LIGHTNESS, ACCENT_CHROMA, hue);
    const backgroundImage = meshBackgroundImage(hue);

    return ogFonts().then(
        (fonts) =>
            new ImageResponse(
                (
                    <div
                        style={{
                            width: OG_SIZE.width,
                            height: OG_SIZE.height,
                            display: "flex",
                            position: "relative",
                            backgroundColor: ogTheme.surfacePrimary,
                            fontFamily: "Noto Sans",
                        }}
                    >
                        {/* Background layer — see meshBackgroundImage's comment on why this needs explicit width/height, not `inset: 0`. */}
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: OG_SIZE.width,
                                height: OG_SIZE.height,
                                display: "flex",
                                backgroundImage,
                            }}
                        />

                        {/* Content layer, on top of the background. */}
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: OG_SIZE.width,
                                height: OG_SIZE.height,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                padding: "72px 80px",
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <div
                                    style={{
                                        fontSize: 26,
                                        fontWeight: 700,
                                        letterSpacing: 4,
                                        textTransform: "uppercase",
                                        color: accent,
                                    }}
                                >
                                    {eyebrow}
                                </div>
                                <div
                                    style={{
                                        marginTop: 28,
                                        fontSize: 66,
                                        fontWeight: 700,
                                        lineHeight: 1.15,
                                        color: ogTheme.textPrimary,
                                    }}
                                >
                                    {title}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ fontSize: 30, lineHeight: 1.4, color: ogTheme.textSecondary }}>{subtitle}</div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        marginTop: 36,
                                        paddingTop: 28,
                                        borderTop: `2px solid ${ ogTheme.borderStrong }`,
                                        fontSize: 26,
                                        color: ogTheme.textMuted,
                                    }}
                                >
                                    {footer}
                                </div>
                            </div>
                        </div>
                    </div>
                ),
                { ...OG_SIZE, fonts },
            ),
    );
}

/**
 * Keeps a headline inside the card. satori has no `text-overflow`, so an
 * over-long title would otherwise push the layout off the canvas rather
 * than being clipped.
 */
export function truncate(value: string, max: number): string {
    return value.length <= max ? value : `${ value.slice(0, max - 1).trimEnd() }…`;
}
