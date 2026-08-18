import { defineComposite } from "@portfolio/design-tokens";

/**
 * A shadow's color is a `color` reference through `alpha()` — never a
 * second, independently hardcoded copy of a brand/neutral value. The
 * pre-migration `tokens.ts` had exactly that defect (`SHADOW_ACCENT_RGB`/
 * `SHADOW_FOCUS_RING_COLOR`-style raw RGB triples disconnected from
 * `tokens/color.ts`) — fixed by routing every color here through the real
 * primitive.
 *
 * `softGlow` (`box-shadow: none`, `SkillCard`'s default/idle state before
 * the `hover:shadow-surface-deep` swap) is deliberately NOT here — it's a
 * CSS keyword, not a color-bearing value, so it doesn't fit this
 * structured, DS001-governed shape. It's a hand-written line in
 * `adapters/tailwind.css` instead (see that file's own comment).
 */
export const shadows = defineComposite("shadow", {
    // Every brand-colored shadow here routes through `{theme.color.interactivePrimary}`,
    // not `{color.brand.500}` directly — a real DS201 crossing against
    // `components/code-block.ts`'s `keyword`, resolved by using the role that already
    // means exactly this ("the brand accent") instead of inventing a new one.
    primaryButton: [
        {
            x: 0, y: 0,
            blur: 2,
            spread: 0,
            color: "alpha({theme.color.interactivePrimary}, 45%)"
        },
        {
            x: 0, y: 4,
            blur: 12,
            spread: 0,
            color: "alpha({theme.color.interactivePrimary}, 30%)"
        },
    ],
    primaryButtonHover: [
        {
            x: 0, y: 0,
            blur: 15,
            spread: 6,
            color: "alpha({theme.color.interactivePrimary}, 60%)"
        },
        {
            x: 0, y: 6,
            blur: 16,
            spread: 0,
            color: "alpha({theme.color.interactivePrimary}, 40%)"
        },
    ],
    surfaceDeep: [{
        x: 0, y: 20,
        blur: 40,
        spread: 0,
        color: "alpha({color.neutral.950}, 60%)"
    }],
    focusRing: [{
        x: 0, y: 0,
        blur: 0,
        spread: 2,
        color: "{theme.color.interactivePrimary}"
    }],
});
