import { describe, expect, it } from "vitest";
import {
    assertRequiredKeys,
    checkOptionalKeyParity,
    TokenValidationError,
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
