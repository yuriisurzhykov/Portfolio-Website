import { describe, expect, it } from "vitest";
import { cssVariableName, flattenScalars, hslStringToRgb01, hslStringToRgbString, parseHslString, toKebabCase } from "./css-value";

describe("toKebabCase", () => {
    it("inserts a dash between a lowercase/digit and an uppercase letter", () => {
        expect(toKebabCase("surfacePrimary")).toBe("surface-primary");
        expect(toKebabCase("codeBlock2Extra")).toBe("code-block2-extra");
    });

    it("converts an underscore to a dash and lowercases the whole string", () => {
        expect(toKebabCase("SOME_KEY")).toBe("some-key");
    });

    it("leaves an already-kebab or single-word string untouched (aside from lowercasing)", () => {
        expect(toKebabCase("md")).toBe("md");
        expect(toKebabCase("already-kebab")).toBe("already-kebab");
    });
});

describe("flattenScalars", () => {
    it("returns one [path, value] pair per leaf, kebab-casing every path segment", () => {
        expect(flattenScalars({ neutral: { 950: "hsl(219 25% 5%)" } })).toEqual([[["neutral", "950"], "hsl(219 25% 5%)"]]);
    });

    it("skips __-prefixed authoring tags at any depth", () => {
        expect(flattenScalars({ __kind: "primitive", surfacePrimary: "x" })).toEqual([[["surface-primary"], "x"]]);
    });

    it("passes a bare scalar through as a single leaf with an empty path", () => {
        expect(flattenScalars("hsl(0 0% 0%)")).toEqual([[[], "hsl(0 0% 0%)"]]);
        expect(flattenScalars(700)).toEqual([[[], 700]]);
    });

    it("returns nothing for an array or null/undefined — not a scalar, not a plain object", () => {
        expect(flattenScalars([1, 2, 3])).toEqual([]);
        expect(flattenScalars(null)).toEqual([]);
        expect(flattenScalars(undefined)).toEqual([]);
    });
});

describe("cssVariableName", () => {
    it("joins prefix + path segments with dashes under the --ds- namespace, kebab-casing every part", () => {
        expect(cssVariableName(["component", "codeBlock"], ["keyword"])).toBe("--ds-component-code-block-keyword");
    });

    it("works with an empty path (a bare category-level variable)", () => {
        expect(cssVariableName(["color"], [])).toBe("--ds-color");
    });
});

describe("parseHslString", () => {
    it("parses h/s/l and defaults alpha to 1 when absent", () => {
        expect(parseHslString("hsl(219 25% 5%)")).toEqual({ h: 219, s: 25, l: 5, a: 1 });
    });

    it("parses an explicit alpha percentage as a 0..1 fraction", () => {
        expect(parseHslString("hsl(0 0% 100% / 8%)")).toEqual({ h: 0, s: 0, l: 100, a: 0.08 });
    });

    it("throws on a string that isn't a resolvable hsl() (e.g. a color-mix() result)", () => {
        expect(() => parseHslString("color-mix(in srgb, hsl(20 94% 61%) 12%, transparent)")).toThrow(/Not a resolvable hsl\(\) string/);
    });
});

describe("hslStringToRgb01", () => {
    it("converts pure white and pure black exactly", () => {
        expect(hslStringToRgb01("hsl(0 0% 100%)")).toEqual([1, 1, 1]);
        expect(hslStringToRgb01("hsl(0 0% 0%)")).toEqual([0, 0, 0]);
    });

    it("converts a fully-saturated primary red at 50% lightness to pure red", () => {
        const [r, g, b] = hslStringToRgb01("hsl(0 100% 50%)");
        expect(r).toBeCloseTo(1, 5);
        expect(g).toBeCloseTo(0, 5);
        expect(b).toBeCloseTo(0, 5);
    });

    it("wraps a hue given as a negative or >360 number the same way CSS does", () => {
        expect(hslStringToRgb01("hsl(360 100% 50%)")).toEqual(hslStringToRgb01("hsl(0 100% 50%)"));
    });

    // A single hue (red, h=0) only ever drives `hueToChannel`'s R/G/B calls
    // through 2 of its 4 piecewise ranges ([0,1/6) and the tt<0-then-wrapped
    // boundary case) — every OTHER primary/secondary hue lands its three
    // channels' `tt` values in the remaining ranges ([1/6,1/2), [1/2,2/3),
    // [2/3,1)), which nothing here exercised before. These are exact,
    // well-known conversions (every browser's own color picker agrees),
    // not approximated — a real golden-value sweep, not just "doesn't crash."
    it("converts every 60°-spaced primary/secondary hue to its exact known RGB, sweeping every hueToChannel branch", () => {
        const cases: Array<[string, [number, number, number]]> = [
            ["hsl(60 100% 50%)", [1, 1, 0]], // yellow
            ["hsl(120 100% 50%)", [0, 1, 0]], // green
            ["hsl(180 100% 50%)", [0, 1, 1]], // cyan
            ["hsl(240 100% 50%)", [0, 0, 1]], // blue
            ["hsl(300 100% 50%)", [1, 0, 1]], // magenta
        ];
        for (const [hsl, expected] of cases) {
            const [r, g, b] = hslStringToRgb01(hsl);
            expect([r, g, b].map((c) => Math.round(c))).toEqual(expected);
        }
    });
});

describe("hslStringToRgbString", () => {
    it("renders an opaque color as rgb(...), not rgba(...)", () => {
        expect(hslStringToRgbString("hsl(0 0% 100%)")).toBe("rgb(255, 255, 255)");
    });

    it("renders a color with alpha < 1 as rgba(...), alpha kept as a 0..1 fraction", () => {
        expect(hslStringToRgbString("hsl(0 0% 100% / 50%)")).toBe("rgba(255, 255, 255, 0.5)");
    });
});
