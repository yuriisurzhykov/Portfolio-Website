import { ImageResponse } from "next/og";
import { darkPalette } from "@/shared/ui/theme/tokens";
import { ogFonts } from "./fonts";

/**
 * The brand accent as sRGB hex, NOT `palette.accent`.
 *
 * satori does not understand `oklch()`, which is the colour space this
 * design system's accent is authored in — and it does not report that: it
 * silently painted the eyebrow near-black, found by looking at a real
 * rendered PNG rather than by any test failing. This is the same colour,
 * taken from `palette.accentTintRgb` (`232,116,58`), which the token file
 * already keeps as the sRGB form of that exact accent for `rgba()` use.
 */
const ACCENT_SRGB = "#e8743a";

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
}

/**
 * One template, three entry points (`journal/[slug]`, `work/[slug]`, and
 * the site default). Rendered by satori, so only the subset of CSS satori
 * implements is available — flexbox, no `gap` shorthand surprises, and
 * every element with more than one child needs an explicit `display`.
 *
 * STRICTLY DETERMINISTIC: no dates, no counters, no random values. Two
 * renders of the same page must be byte-identical, or the screenshot
 * baseline in `tests/e2e/og-image.spec.ts` is worthless — the same rule the
 * design-system playground's demo sections follow.
 */
export function renderOgImage({ eyebrow, title, subtitle, footer }: OgCardProps): Promise<ImageResponse> {
    return ogFonts().then(
        (fonts) =>
            new ImageResponse(
                (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            backgroundColor: darkPalette.bg,
                            padding: "72px 80px",
                            fontFamily: "Noto Sans",
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div
                                style={{
                                    fontSize: 26,
                                    fontWeight: 700,
                                    letterSpacing: 4,
                                    textTransform: "uppercase",
                                    color: ACCENT_SRGB,
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
                                    color: darkPalette.text,
                                }}
                            >
                                {title}
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontSize: 30, lineHeight: 1.4, color: darkPalette.text2 }}>{subtitle}</div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginTop: 36,
                                    paddingTop: 28,
                                    borderTop: `2px solid ${ darkPalette.borderStrong }`,
                                    fontSize: 26,
                                    color: darkPalette.muted,
                                }}
                            >
                                {footer}
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
