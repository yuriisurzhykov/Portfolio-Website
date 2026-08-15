import { describe, expect, it } from "vitest";
import {
    assertRequiredKeys,
    checkOptionalKeyParity,
    TokenValidationError,
    validateColorFieldsDeep,
    validateColorPrimitiveFormat,
    validateNoRawColorLiterals,
    validateNoSemanticToSemanticRefs,
    validateReferences,
    validateUniqueVariableNames,
} from "./validate";

describe("assertRequiredKeys", () => {
    it("passes silently when every required key is present", () => {
        expect(() => assertRequiredKeys({ surfacePrimary: "x", interactivePrimary: "y" }, ["surfacePrimary", "interactivePrimary"], "theme")).not.toThrow();
    });

    it("throws DS005 naming every missing key, not just the first", () => {
        expect(() => assertRequiredKeys({ surfacePrimary: "x" }, ["surfacePrimary", "interactivePrimary", "textPrimary"], "theme(\"color\")"))
            .toThrow(/DS005 theme\("color"\) is missing required key\(s\): interactivePrimary, textPrimary/);
    });

    it("treats an explicit undefined value as missing, not present", () => {
        expect(() => assertRequiredKeys({ surfacePrimary: undefined } as never, ["surfacePrimary"], "theme")).toThrow(TokenValidationError);
    });
});

describe("checkOptionalKeyParity", () => {
    it("warns when an optional key exists in one theme but not the other", () => {
        const warnings = checkOptionalKeyParity(
            { dark: { decorativeAccent: "a" }, light: {} },
            new Set(),
        );
        expect(warnings).toEqual([expect.stringContaining('DS006 optional key "decorativeAccent" is present in [dark] but missing from [light]')]);
    });

    it("does not warn about a required key even if it were (hypothetically) absent — DS005 owns that case", () => {
        const warnings = checkOptionalKeyParity(
            { dark: { surfacePrimary: "a" }, light: {} },
            new Set(["surfacePrimary"]),
        );
        expect(warnings).toEqual([]);
    });

    it("does not warn when a key is present in every theme, or absent from every theme", () => {
        const warnings = checkOptionalKeyParity(
            { dark: { shared: "a" }, light: { shared: "b" } },
            new Set(),
        );
        expect(warnings).toEqual([]);
    });

    // Every tree checkOptionalKeyParity actually receives in real use
    // (defineTheme()'s output) carries __kind/__category tags — this proves
    // the skip is real, not just coincidentally never triggered because
    // both trees always carry the identical tag: an ASYMMETRIC authoring
    // tag (present in only one tree) must never itself become a DS006
    // warning.
    it("never flags a double-underscore-prefixed authoring tag, even when it's asymmetric between trees", () => {
        const warnings = checkOptionalKeyParity(
            { dark: { __onlyInDark: "x", shared: "a" }, light: { shared: "a" } },
            new Set(),
        );
        expect(warnings).toEqual([]);
    });

    // With exactly one name on each side, `.join(", ")` and `.join("")`
    // produce identical output ("dark" either way) — only 2+ names on a
    // side actually distinguishes the real separator from a mutated one.
    it("joins multiple present/missing theme names with ', ', not concatenated with no separator", () => {
        const warnings = checkOptionalKeyParity(
            { dark: { accent: "a" }, light: { accent: "b" }, dim: {} },
            new Set(),
        );
        expect(warnings).toEqual(['DS006 optional key "accent" is present in [dark, light] but missing from [dim]']);
    });
});

describe("validateColorPrimitiveFormat", () => {
    it("accepts a real hsl() string at any depth", () => {
        expect(() => validateColorPrimitiveFormat({ neutral: { 950: "hsl(219 25% 5%)" } })).not.toThrow();
    });

    it("rejects a hex literal", () => {
        expect(() => validateColorPrimitiveFormat({ brand: { 500: "#e8743a" } })).toThrow(/DS001 color primitive "brand.500" is not a valid hsl\(\) string/);
    });

    it("rejects rgb()/oklch() the same way", () => {
        expect(() => validateColorPrimitiveFormat({ a: "rgb(1, 2, 3)" })).toThrow(TokenValidationError);
        expect(() => validateColorPrimitiveFormat({ a: "oklch(0.72 0.17 45)" })).toThrow(TokenValidationError);
    });

    // The top-level guard (`!node || typeof node !== "object" || Array.isArray(node)`)
    // — a project with no color category at all calls this with `undefined`
    // (see compile.ts's `validateColorPrimitiveFormat(input.primitives.color)`,
    // never guarded at the call site).
    it("no-ops silently on null/undefined/a non-object/an array — the exact shape a color-less project's call site passes", () => {
        expect(() => validateColorPrimitiveFormat(undefined)).not.toThrow();
        expect(() => validateColorPrimitiveFormat(null)).not.toThrow();
        expect(() => validateColorPrimitiveFormat("not an object")).not.toThrow();
        expect(() => validateColorPrimitiveFormat(["hsl(0 0% 0%)"])).not.toThrow();
    });
});

describe("validateNoRawColorLiterals", () => {
    it("accepts a reference string", () => {
        expect(() => validateNoRawColorLiterals({ surfacePrimary: "{color.neutral.950}" })).not.toThrow();
        expect(() => validateNoRawColorLiterals({ subtle: "alpha({color.brand.500}, 12%)" })).not.toThrow();
    });

    it("rejects a raw literal anywhere outside a primitive layer", () => {
        expect(() => validateNoRawColorLiterals({ surfacePrimary: "hsl(219 25% 5%)" })).toThrow(/DS001 raw color literal outside a primitive layer at "surfacePrimary"/);
    });

    it("rejects a raw literal nested inside a component token", () => {
        expect(() => validateNoRawColorLiterals({ codeBlock: { keyword: "#a78bfa" } })).toThrow(/at "codeBlock.keyword"/);
    });

    it("passes numbers through (radius/motion categories carry numeric leaves too)", () => {
        expect(() => validateNoRawColorLiterals({ weight: 700 })).not.toThrow();
    });

    it("passes null/undefined through untouched at the top level, not just nested", () => {
        expect(() => validateNoRawColorLiterals(null)).not.toThrow();
        expect(() => validateNoRawColorLiterals(undefined)).not.toThrow();
    });

    // The array branch (a gradient's `stops` array, in real use) — proves
    // BOTH that it recurses into array items AND that the index becomes
    // part of the reported path, not silently dropped.
    it("recurses into an array, reporting the offending item's numeric index in the path", () => {
        expect(() => validateNoRawColorLiterals({ stops: ["{color.brand.500}", "hsl(219 25% 5%)"] })).toThrow(
            /DS001 raw color literal outside a primitive layer at "stops\.1"/,
        );
    });
});

describe("validateColorFieldsDeep", () => {
    // Only ever exercised before through compile.test.ts's full gradient/
    // shadow composite tests — these pin the function's own branches
    // directly: the array-of-layers case (a shadow), the "color" key
    // routing to validateNoRawColorLiterals, structural (non-"color")
    // literals passing through untouched, and the __-tag skip.
    it("validates only the field literally named 'color', leaving structural sibling literals alone", () => {
        expect(() => validateColorFieldsDeep({ type: "linear", angle: 135, color: "hsl(20 94% 61%)" })).toThrow(
            /DS001 raw color literal outside a primitive layer at "color"/,
        );
        expect(() => validateColorFieldsDeep({ type: "linear", angle: 135, color: "{color.brand.500}" })).not.toThrow();
    });

    it("recurses into an array of layers (a shadow composite's real shape), reporting the layer's index", () => {
        const layers = [{ x: 0, y: 4, color: "{color.neutral.950}" }, { x: 0, y: 8, color: "hsl(219 25% 5%)" }];
        expect(() => validateColorFieldsDeep(layers)).toThrow(/at "1\.color"/);
    });

    it("recurses into a nested non-'color' key looking for a 'color' field deeper inside", () => {
        expect(() => validateColorFieldsDeep({ stops: [{ color: "hsl(20 94% 61%)" }] })).toThrow(/at "stops\.0\.color"/);
    });

    // A raw color BURIED under a `__`-prefixed key — the only shape that
    // actually proves the skip does something (a __-tag holding a plain
    // string, as authoring tags realistically look, would no-op either way
    // once it hits the string/non-object leaf check regardless of the skip).
    it("skips a double-underscore-prefixed authoring tag entirely, even one whose value would otherwise contain a violation", () => {
        expect(() => validateColorFieldsDeep({ __kind: { color: "hsl(0 0% 0%)" } })).not.toThrow();
    });

    it("no-ops on a non-object, non-array leaf (a number/string with no 'color' field to find)", () => {
        expect(() => validateColorFieldsDeep(42)).not.toThrow();
        expect(() => validateColorFieldsDeep(null)).not.toThrow();
    });
});

describe("validateNoSemanticToSemanticRefs", () => {
    it("passes when every reference is a primitive", () => {
        expect(() => validateNoSemanticToSemanticRefs({ surfacePrimary: "{color.neutral.950}" }, "theme")).not.toThrow();
    });

    it("rejects a theme role pointing at another theme role", () => {
        expect(() => validateNoSemanticToSemanticRefs({ borderFocus: "{theme.color.interactivePrimary}" }, 'theme("color")'))
            .toThrow(/DS004 theme\("color"\) contains a semantic-to-semantic reference: "\{theme\.color\.interactivePrimary\}"/);
    });

    it("rejects a flat-semantic role pointing at another semantic namespace", () => {
        expect(() => validateNoSemanticToSemanticRefs({ control: "{semantic.spacing.md}" }, "semantic(\"radius\")")).toThrow(TokenValidationError);
    });
});

describe("validateReferences", () => {
    it("passes when every reference resolves", () => {
        const registry = { color: { brand: { 500: "hsl(20 94% 61%)" } } };
        expect(() => validateReferences(registry, [{ interactivePrimary: "{color.brand.500}" }])).not.toThrow();
    });

    it("throws DS002 for an unknown reference", () => {
        const registry = { color: { brand: {} } };
        expect(() => validateReferences(registry, [{ interactivePrimary: "{color.brand.500}" }])).toThrow(/DS002 Unknown token reference: "\{color\.brand\.500\}"/);
    });
});

describe("validateUniqueVariableNames", () => {
    it("passes for a set of unique names", () => {
        expect(() => validateUniqueVariableNames(["--ds-color-a", "--ds-color-b"])).not.toThrow();
    });

    it("throws DS007 on the first duplicate", () => {
        expect(() => validateUniqueVariableNames(["--ds-color-a", "--ds-color-a"])).toThrow(/DS007 duplicate generated CSS variable name: "--ds-color-a"/);
    });
});
