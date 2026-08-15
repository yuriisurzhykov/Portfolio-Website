import { hslStringToRgb01 } from "@portfolio/design-tokens";
import { resolved } from "../generated/resolved";

/**
 * `ProjectGraph`'s WebGL canvas needs plain 0..1 sRGB triples (uniforms),
 * not CSS strings — it can't inherit a CSS background the way a regular
 * DOM element would, and can't run a CSS color-math library the way
 * Mermaid's "base" theme does either.
 *
 * `hslStringToRgb01` is the one exception to "adapters never import
 * `@portfolio/design-tokens` at runtime": it's a small, pure, stateless
 * HSL→RGB conversion with no project-specific knowledge and no reference-
 * resolution/validation logic — a generic color-math utility, not "the
 * compiler." Everything else here still comes only from
 * `generated/resolved.ts`, never the raw theme source.
 *
 * Replaces `ProjectGraph.tsx`'s previous `ACCENT_RGB`/`SCENE_PALETTE`
 * constants — hand-copied sRGB triples, disconnected from any real token
 * source (their own comments admitted it, no import existed) — living
 * proof, found during this exact migration, of the drift this
 * architecture exists to prevent.
 */
export const projectGraphAccentRgb: readonly [number, number, number] = hslStringToRgb01(resolved.dark.color.interactivePrimary);

export const projectGraphScenePalette: Record<"dark" | "light", {
    background: readonly [number, number, number];
    ink: readonly [number, number, number]
}> = {
    dark: {
        background: hslStringToRgb01(resolved.dark.color.surfacePrimary),
        ink: hslStringToRgb01(resolved.dark.color.textInverse),
    },
    light: {
        background: hslStringToRgb01(resolved.light.color.surfacePrimary),
        ink: hslStringToRgb01(resolved.light.color.textInverse),
    },
};
