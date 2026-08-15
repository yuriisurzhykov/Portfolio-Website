import { defineComposite } from "@portfolio/design-tokens";

/**
 * Structured gradient recipes — kept as data, not a hand-written CSS
 * string, so every consumer (CSS, and any future non-CSS renderer) can
 * choose its own representation from the same source.
 *
 * `glow`: `ARCHITECTURE.md`'s own worked composite example (section 3.9),
 * ported as-is.
 *
 * `mesh`: `PlaceholderCover`'s real, actively-used 4-spot mesh background
 * (`bg-accent-mesh-gradient` today) — four independently-positioned radial
 * layers stacked via `type: "layered"`, which is what makes it read as an
 * organic mesh rather than a single blurred blend. Each layer's second
 * stop is the SAME spot color at `opacity: 0` (not the CSS keyword
 * "transparent" directly — that wouldn't be a reference, and DS001 bans a
 * raw literal here) — `color-mix(..., 0%, transparent)` collapses to fully
 * transparent regardless of hue, so the visual result is identical.
 */
export const gradients = defineComposite("gradient", {
    glow: {
        type: "radial", position: "30% 30%",
        stops: [
            { color: "{theme.color.interactivePrimaryHover}", position: 0 },
            { color: "{color.accent.magenta}", position: 55 },
            // Fades to fully transparent (opacity 0 discards the hue entirely,
            // same trick `mesh` below uses) — re-uses `accent.magenta`, the
            // stop right above, rather than `ARCHITECTURE.md`'s original
            // `{color.neutral.0}`. Found live: `color.neutral.0` used ONLY
            // for this "the color doesn't matter, it's transparent" purpose
            // is exactly what `npm run tokens:check` flagged as a real DS201
            // crossing once `components/code-block.ts`'s `hoverBackground`
            // (a MEANINGFUL, not arbitrary, use of white) also referenced it
            // directly — reusing this gradient's own other stop instead of a
            // shared "white" primitive keeps the two unrelated concerns from
            // being coupled just because they coincidentally chose the same hue.
            { color: "{color.accent.magenta}", position: 75, opacity: 0 },
        ],
    },
    // Spot colors reference PRIMITIVES directly, not a `theme.color.meshSpot*`
    // indirection — that indirection existed in an earlier draft of this file
    // and `npm run tokens:check` correctly flagged it as DS102 (a global-semantic
    // role with exactly ONE component/composite consumer): these 4 colors are
    // theme-invariant in this pass anyway (see the dated comment this replaces
    // in `themes/dark.ts`/`light.ts`), so the extra layer was pure ceremony.
    // `accent.blue` swapped for `success.300` (not `accent.blue` directly) —
    // `components/code-block.ts`'s `function`/`property` syntax color ALSO
    // reaches for `accent.blue` directly, and that's a real DS201 crossing
    // with no shared meaning behind it (a decorative background blob being
    // blue has nothing to do with function names being blue) — same
    // "same value, different meaning" case the plan's own `red.500`
    // danger/sale/syntax-error example describes, so the fix is a different
    // primitive, not a forced-shared role.
    mesh: {
        type: "layered",
        layers: [
            {
                type: "radial",
                position: "15% 20%",
                stops: [{ color: "{color.brand.400}", position: 0 }, {
                    color: "{color.brand.400}",
                    position: 50,
                    opacity: 0
                }]
            },
            {
                type: "radial",
                position: "82% 15%",
                stops: [{ color: "{color.accent.magenta}", position: 0 }, {
                    color: "{color.accent.magenta}",
                    position: 55,
                    opacity: 0
                }]
            },
            {
                type: "radial",
                position: "75% 70%",
                stops: [{ color: "{color.success.300}", position: 0 }, {
                    color: "{color.success.300}",
                    position: 55,
                    opacity: 0
                }]
            },
            {
                type: "radial",
                position: "15% 85%",
                stops: [{ color: "{color.accent.purple}", position: 0 }, {
                    color: "{color.accent.purple}",
                    position: 50,
                    opacity: 0
                }]
            },
        ],
    },
});
