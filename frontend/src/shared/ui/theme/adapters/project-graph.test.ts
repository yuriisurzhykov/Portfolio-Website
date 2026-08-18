import { hslStringToRgb01 } from "@portfolio/design-tokens";
import { describe, expect, it, vi } from "vitest";
import { resolved } from "../generated/resolved";

/**
 * `projectGraphScenePalette` is computed once, at module-load time, from a
 * top-level object literal — a plain top-level `import` only runs that
 * computation once for the whole file, so Stryker can't attribute it to any
 * single test and marks its mutants `Ignored` (the same `ignoreStatic`
 * interaction as `shared/lib/seo/site-url.ts` — see its test file's own
 * comment). `vi.resetModules()` + a dynamic `import()` per test re-runs the
 * module body under each test, so mutation testing actually exercises it.
 */
async function loadPalette() {
    vi.resetModules();
    const { projectGraphScenePalette } = await import("./project-graph");
    return projectGraphScenePalette;
}

describe("projectGraphScenePalette", () => {
    it.each(["dark", "light"] as const)(
        "%s theme's ink is a real, distinct color from its background — never the same RGB triple",
        async (mode) => {
            const palette = await loadPalette();
            // Real regression (see theme/README.md's dated entry): `ink` used
            // to equal `background` in both themes, so the WebGL grid vanished.
            expect(palette[mode].ink).not.toEqual(palette[mode].background);
        },
    );

    it("dark theme's ink resolves through textPrimary, the role actually meant to contrast surfacePrimary", async () => {
        const palette = await loadPalette();
        expect(palette.dark.ink).toEqual(hslStringToRgb01(resolved.dark.color.textPrimary));
    });

    it("light theme's ink resolves through textPrimary, the role actually meant to contrast surfacePrimary", async () => {
        const palette = await loadPalette();
        expect(palette.light.ink).toEqual(hslStringToRgb01(resolved.light.color.textPrimary));
    });
});
