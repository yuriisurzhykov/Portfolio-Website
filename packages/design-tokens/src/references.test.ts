import { describe, expect, it } from "vitest";
import { collectReferences, getByPath, resolveString, resolveTree, TokenReferenceError } from "./references";

describe("getByPath", () => {
    it("resolves a nested dotted path", () => {
        expect(getByPath({ color: { brand: { 500: "hsl(20 94% 61%)" } } }, "color.brand.500")).toBe("hsl(20 94% 61%)");
    });

    it("returns undefined for a path that doesn't exist, never throws", () => {
        expect(getByPath({ color: {} }, "color.brand.500")).toBeUndefined();
        expect(getByPath({}, "a.b.c")).toBeUndefined();
    });
});

describe("resolveString", () => {
    const registry = {
        color: { neutral: { 950: "hsl(219 25% 5%)" }, brand: { 500: "hsl(20 94% 61%)" } },
        theme: { color: { surfacePrimary: "{color.neutral.950}" } },
    };

    it("resolves a single reference to its primitive value", () => {
        expect(resolveString("{color.brand.500}", registry)).toBe("hsl(20 94% 61%)");
    });

    it("resolves a reference that itself resolves to another reference (theme role -> primitive)", () => {
        expect(resolveString("{theme.color.surfacePrimary}", registry)).toBe("hsl(219 25% 5%)");
    });

    it("resolves an alpha() call into color-mix()", () => {
        expect(resolveString("alpha({color.brand.500}, 12%)", registry)).toBe("color-mix(in srgb, hsl(20 94% 61%) 12%, transparent)");
    });

    it("throws TokenReferenceError for an unresolvable path", () => {
        expect(() => resolveString("{color.brand.9999}", registry)).toThrow(TokenReferenceError);
    });

    it("throws TokenReferenceError on a circular reference", () => {
        const circular = { theme: { color: { a: "{theme.color.b}", b: "{theme.color.a}" } } };
        expect(() => resolveString("{theme.color.a}", circular)).toThrow(/Circular token reference/);
    });

    it("leaves a plain literal untouched", () => {
        expect(resolveString("0.5rem", registry)).toBe("0.5rem");
    });
});

describe("resolveTree", () => {
    it("resolves every scalar leaf recursively and drops authoring tags", () => {
        const registry = { color: { brand: { 500: "hsl(20 94% 61%)" } } };
        const tree = { __kind: "semantic", __category: "color", interactivePrimary: "{color.brand.500}" } as const;
        expect(resolveTree(tree, registry)).toEqual({ interactivePrimary: "hsl(20 94% 61%)" });
    });

    it("passes numbers through untouched and resolves nested objects/arrays", () => {
        const registry = { color: { brand: { 500: "hsl(20 94% 61%)" } } };
        const tree = { weight: 700, nested: { a: "{color.brand.500}" }, list: [{ a: "{color.brand.500}" }] };
        expect(resolveTree(tree, registry)).toEqual({ weight: 700, nested: { a: "hsl(20 94% 61%)" }, list: [{ a: "hsl(20 94% 61%)" }] });
    });
});

describe("collectReferences", () => {
    it("finds every {path} and alpha() path across a nested tree, ignoring authoring tags", () => {
        const tree = {
            __kind: "component",
            __namespace: "codeBlock",
            background: "{theme.color.surfacePrimary}",
            keyword: "{color.accent.purple}",
            focus: "alpha({color.brand.500}, 12%)",
        };
        expect([...collectReferences(tree)].sort()).toEqual(["color.accent.purple", "color.brand.500", "theme.color.surfacePrimary"]);
    });
});
