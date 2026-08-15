import { definePrimitives } from "@portfolio/design-tokens";

/**
 * Carried over from the pre-migration `tokens.ts`'s `motion`, unreviewed —
 * structure only for this pass (see `composites/transitions.ts`). Durations
 * are now `"150ms"`-shaped strings instead of bare numbers (`150`) that
 * `theme.css.ts` used to append `ms` to at serialization time — a
 * representation change only, not a value change: the compiler has one
 * generic string/number leaf shape, not a duration-specific unit-appending
 * special case.
 */
export const motion = definePrimitives({
    duration: {
        instant: "75ms",
        fast: "150ms",
        normal: "250ms",
        slow: "500ms",
    },
    easing: {
        standard: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        entrance: "cubic-bezier(0.3, 0.0, 0.2, 1)",
        exit: "cubic-bezier(0.4, 0.0, 0.6, 1)",
    },
    scale: {
        press: 0.97,
        highlight: 1.02,
    },
});
