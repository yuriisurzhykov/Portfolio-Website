import { describe, expect, it } from "vitest";
import { mergeTokenTree } from "./merge";

describe("mergeTokenTree", () => {
    it("keeps every base key untouched when overrides is empty", () => {
        const base = { statusSuccess: "{color.success.500}", borderFocus: "{color.brand.500}" };
        expect(mergeTokenTree(base, {})).toEqual(base);
    });

    it("override wins for a key present in both", () => {
        const base = { surfacePrimary: "{color.neutral.950}" };
        expect(mergeTokenTree(base, { surfacePrimary: "{color.neutral.0}" })).toEqual({ surfacePrimary: "{color.neutral.0}" });
    });

    it("extends with a brand-new key not present in base — no cast needed, TBase/TOverrides are independent type params", () => {
        const base = { surfacePrimary: "{color.neutral.950}" };
        const result = mergeTokenTree(base, { decorativeAccent: "{color.accent.purple}" });
        expect(result).toEqual({ surfacePrimary: "{color.neutral.950}", decorativeAccent: "{color.accent.purple}" });
        // Both key sets are visible on the result's own inferred type, unforced:
        expect(result.surfacePrimary).toBe("{color.neutral.950}");
        expect(result.decorativeAccent).toBe("{color.accent.purple}");
    });

    it("the plan's real use case: two mostly-disjoint objects (shared roles + per-theme roles) combine into one", () => {
        const sharedColorRoles = { borderFocus: "{color.brand.500}", statusSuccess: "{color.success.500}" };
        const perThemeRoles = { surfacePrimary: "{color.neutral.950}", textPrimary: "{color.neutral.50}" };
        expect(mergeTokenTree(sharedColorRoles, perThemeRoles)).toEqual({
            borderFocus: "{color.brand.500}",
            statusSuccess: "{color.success.500}",
            surfacePrimary: "{color.neutral.950}",
            textPrimary: "{color.neutral.50}",
        });
    });

    it("merges nested plain objects recursively instead of replacing the whole subtree", () => {
        const base = { neutral: { 0: "hsl(219 0% 100%)", 950: "hsl(219 25% 5%)" } };
        expect(mergeTokenTree(base, { neutral: { 500: "hsl(219 20% 46%)" } })).toEqual({
            neutral: { 0: "hsl(219 0% 100%)", 950: "hsl(219 25% 5%)", 500: "hsl(219 20% 46%)" },
        });
    });

    it("replaces an array wholesale rather than merging element-wise (a gradient's stop list is one unit of meaning)", () => {
        const base = { stops: [{ position: 0 }, { position: 100 }] };
        const overrideStops = [{ position: 50 }];
        expect(mergeTokenTree(base, { stops: overrideStops })).toEqual({ stops: overrideStops });
    });

    it("ignores an explicit undefined override, leaving the base value in place", () => {
        const base = { a: "1", b: "2" };
        expect(mergeTokenTree(base, { a: undefined } as never)).toEqual({ a: "1", b: "2" });
    });
});
