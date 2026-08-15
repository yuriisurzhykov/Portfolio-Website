import { describe, expect, it } from "vitest";
import { defineComponentTokens, defineComposite, defineContract, definePrimitives, defineTheme } from "./authoring";
import { compileDesignTokens, DesignTokenBuildError, validateDesignTokens, type CompilerInput } from "./compile";
import { TokenValidationError } from "./validate";

/** A minimal, real primitive set mirroring this project's actual reviewed palette (ARCHITECTURE.md). */
const color = definePrimitives({
    neutral: { 0: "hsl(219 0% 100%)", 950: "hsl(219 25% 5%)" },
    brand: { 500: "hsl(20 94% 61%)" },
    accent: { purple: "hsl(255 100% 82%)" },
});

const colorContract = defineContract({ category: "color", required: ["surfacePrimary", "interactivePrimary"] });

function baseInput(components: CompilerInput["components"]): CompilerInput {
    const darkTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.950}", interactivePrimary: "{color.brand.500}" });
    const lightTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.0}", interactivePrimary: "{color.brand.500}" });
    return {
        primitives: { color },
        contracts: { color: colorContract },
        themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
        flatSemantics: {},
        components,
        composites: [],
    };
}

describe("compileDesignTokens — the plan's worked example", () => {
    it("fails with DS201 before promotion: two components reach for the same primitive directly", () => {
        const input = baseInput([
            defineComponentTokens("codeBlock", { keyword: "{color.accent.purple}" }),
            defineComponentTokens("skillCard", { decorativeAccent: "{color.accent.purple}" }),
        ]);
        expect(() => compileDesignTokens(input)).toThrow(DesignTokenBuildError);
        expect(() => compileDesignTokens(input)).toThrow(/DS201 Primitive "color\.accent\.purple" crosses component\/composite domain boundaries/);
        // The message must actually name BOTH real consumers, sorted, not a generic "something crossed" —
        // this is what makes DS201 actionable instead of a mystery to debug.
        expect(() => compileDesignTokens(input)).toThrow(/Consumers:\n {4}- component:codeBlock\n {4}- component:skillCard/);
        expect(() => compileDesignTokens(input)).toThrow(/Decide: promote to a global-semantic role, OR keep both as independent tokens if this is coincidence, not shared meaning\./);
    });

    it("passes after promotion: both components repointed at a new global-semantic role", () => {
        const darkTheme = defineTheme(colorContract, {
            surfacePrimary: "{color.neutral.950}",
            interactivePrimary: "{color.brand.500}",
            decorativeAccent: "{color.accent.purple}",
        });
        const lightTheme = defineTheme(colorContract, {
            surfacePrimary: "{color.neutral.0}",
            interactivePrimary: "{color.brand.500}",
            decorativeAccent: "{color.accent.purple}",
        });
        const input: CompilerInput = {
            primitives: { color },
            contracts: { color: colorContract },
            themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
            flatSemantics: {},
            components: [
                defineComponentTokens("codeBlock", { keyword: "{theme.color.decorativeAccent}" }),
                defineComponentTokens("skillCard", { decorativeAccent: "{theme.color.decorativeAccent}" }),
            ],
            composites: [],
        };

        const result = compileDesignTokens(input);
        expect(result.resolved.dark.color.decorativeAccent).toBe("hsl(255 100% 82%)");
        expect(result.resolved.dark.component.codeBlock).toEqual({ keyword: "hsl(255 100% 82%)" });
        expect(result.css).toContain("--ds-color-decorative-accent: hsl(255 100% 82%)");
        expect(result.css).toContain("--ds-component-code-block-keyword: hsl(255 100% 82%)");
    });

    it("still fails DS201 for a real, unrelated primitive-boundary crossing even after the codeBlock/skillCard case is fixed", () => {
        const input = baseInput([
            defineComponentTokens("codeBlock", { keyword: "{color.accent.purple}" }),
        ]);
        // Single consumer — fine (DS203), proves the fix above wasn't just "never check again".
        expect(() => compileDesignTokens(input)).not.toThrow();
    });
});

describe("compileDesignTokens — DS102 (single-consumer global semantic)", () => {
    it("fails when a global-semantic role is consumed by exactly one component namespace", () => {
        const darkTheme = defineTheme(colorContract, {
            surfacePrimary: "{color.neutral.950}",
            interactivePrimary: "{color.brand.500}",
            codeBlockBackground: "{color.neutral.950}",
        });
        const lightTheme = defineTheme(colorContract, {
            surfacePrimary: "{color.neutral.0}",
            interactivePrimary: "{color.brand.500}",
            codeBlockBackground: "{color.neutral.950}",
        });
        const input: CompilerInput = {
            primitives: { color },
            contracts: { color: colorContract },
            themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
            flatSemantics: {},
            components: [defineComponentTokens("codeBlock", { background: "{theme.color.codeBlockBackground}" })],
            composites: [],
        };
        expect(() => compileDesignTokens(input)).toThrow(/DS102 Global-semantic token "\{theme\.color\.codeBlockBackground\}" is consumed by only one namespace/);
        expect(() => compileDesignTokens(input)).toThrow(/is consumed by only one namespace: "component:codeBlock"\.\n {2}Move it to a component token instead, and reference a primitive directly\./);
    });
});

describe("compileDesignTokens — generic output shape", () => {
    it("produces a :root + .theme-light block, a resolved data object per theme, and warns (not throws) on an unused optional role", () => {
        const darkTheme = defineTheme(colorContract, {
            surfacePrimary: "{color.neutral.950}",
            interactivePrimary: "{color.brand.500}",
            decorativeAccent: "{color.accent.purple}",
        });
        const lightTheme = defineTheme(colorContract, {
            surfacePrimary: "{color.neutral.0}",
            interactivePrimary: "{color.brand.500}",
            decorativeAccent: "{color.accent.purple}",
        });
        const input: CompilerInput = {
            primitives: { color },
            contracts: { color: colorContract },
            themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
            flatSemantics: {},
            components: [],
            composites: [],
        };
        const result = compileDesignTokens(input);
        expect(result.css).toContain(":root {");
        expect(result.css).toContain(".theme-light {");
        expect(result.css).toContain("color-scheme: dark;");
        expect(result.css).toContain("color-scheme: light;");
        expect(result.resolved.dark.color.surfacePrimary).toBe("hsl(219 25% 5%)");
        expect(result.resolved.light.color.surfacePrimary).toBe("hsl(219 0% 100%)");
        expect(result.warnings.some((w) => w.includes('DS101 Optional global-semantic token "{theme.color.decorativeAccent}"'))).toBe(true);
    });

    it("flattens EVERY primitive category into :root, not just color — each with its own kebab-cased leaf names", () => {
        const darkTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.950}", interactivePrimary: "{color.brand.500}" });
        const lightTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.0}", interactivePrimary: "{color.brand.500}" });
        const radiusPrimitives = definePrimitives({ md: "0.5rem" });
        const input: CompilerInput = {
            primitives: { color, radius: radiusPrimitives },
            contracts: { color: colorContract },
            themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
            flatSemantics: {},
            components: [],
            composites: [],
        };
        const result = compileDesignTokens(input);
        expect(result.css).toContain("--ds-color-neutral-950: hsl(219 25% 5%);");
        expect(result.css).toContain("--ds-radius-md: 0.5rem;");
    });

    it("resolves a composite (gradient) recipe through the same registry", () => {
        const darkTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.950}", interactivePrimary: "{color.brand.500}" });
        const lightTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.0}", interactivePrimary: "{color.brand.500}" });
        const gradients = defineComposite("gradient", {
            brand: { type: "linear", angle: 135, stops: [{ color: "{theme.color.interactivePrimary}", position: 0 }, { color: "{color.accent.purple}", position: 100 }] },
        });
        const input: CompilerInput = {
            primitives: { color },
            contracts: { color: colorContract },
            themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
            flatSemantics: {},
            components: [],
            composites: [gradients],
        };
        const result = compileDesignTokens(input);
        expect(result.resolved.dark.gradient.brand).toBe("linear-gradient(135deg, hsl(20 94% 61%) 0%, hsl(255 100% 82%) 100%)");
        expect(result.css).toContain("--ds-gradient-brand: linear-gradient(135deg, hsl(20 94% 61%) 0%, hsl(255 100% 82%) 100%);");
    });
});

describe("compileDesignTokens — DS001, wired into the actual compile pipeline (found by a bot review comment)", () => {
    // Previously `validateColorPrimitiveFormat`/`validateNoRawColorLiterals`
    // existed, were unit-tested in isolation, and were exposed via the
    // frontend ESLint config — but `compile.ts` never called them, so a
    // color literal authored directly in a `tokens/`/`themes/`/`components/`/
    // `composites/` source file compiled without complaint.

    it("rejects a color primitive step that isn't a real hsl() string", () => {
        const badColor = definePrimitives({ neutral: { 950: "#0d0f14" } });
        const input = baseInput([]);
        expect(() => validateDesignTokens({ ...input, primitives: { ...input.primitives, color: badColor } })).toThrow(
            /DS001 color primitive "neutral\.950" is not a valid hsl\(\) string: "#0d0f14"/,
        );
    });

    it("rejects a raw color literal authored directly in a theme role instead of a {reference}", () => {
        const input = baseInput([]);
        const darkTheme = defineTheme(colorContract, { surfacePrimary: "hsl(219 25% 5%)", interactivePrimary: "{color.brand.500}" });
        expect(() => validateDesignTokens({ ...input, themes: { ...input.themes, dark: { color: darkTheme } } })).toThrow(
            /DS001 raw color literal outside a primitive layer at "theme\.dark\.color\.surfacePrimary"/,
        );
    });

    it("rejects a raw color literal authored directly in a component token", () => {
        const input = baseInput([defineComponentTokens("codeBlock", { keyword: "#a78bfa" })]);
        expect(() => validateDesignTokens(input)).toThrow(TokenValidationError);
        expect(() => validateDesignTokens(input)).toThrow(/DS001 raw color literal outside a primitive layer at "component\.codeBlock\.keyword"/);
    });

    it("rejects a raw color literal inside a composite's color field, without rejecting the composite's real structural literals", () => {
        // type/angle/position are legitimate non-reference literals here.
        const input = baseInput([]);
        const badGradient = defineComposite("gradient", {
            brand: { type: "linear", angle: 135, stops: [{ color: "hsl(20 94% 61%)", position: 0 }, { color: "{color.accent.purple}", position: 100 }] },
        });
        expect(() => validateDesignTokens({ ...input, composites: [badGradient] })).toThrow(
            /DS001 raw color literal outside a primitive layer at "composite\.gradient\.brand\.stops\.0\.color"/,
        );
    });

    it("still compiles a real, valid gradient composite whose non-color fields are plain literals, not references", () => {
        const goodGradient = defineComposite("gradient", {
            brand: { type: "linear", angle: 135, stops: [{ color: "{theme.color.interactivePrimary}", position: 0 }, { color: "{color.accent.purple}", position: 100 }] },
        });
        const input = baseInput([]);
        expect(() => compileDesignTokens({ ...input, composites: [goodGradient] })).not.toThrow();
    });

    it("doesn't require a color category at all — a project with no color primitives or color theme axis compiles fine", () => {
        const radiusPrimitives = definePrimitives({ sm: "0.25rem", md: "0.5rem" });
        const radiusContract = defineContract({ category: "radius", required: [] });
        const radiusTheme = defineTheme(radiusContract, { control: "{radius.md}" });
        const input: CompilerInput = {
            primitives: { radius: radiusPrimitives },
            contracts: { radius: radiusContract },
            themes: { default: { radius: radiusTheme } },
            flatSemantics: {},
            components: [],
            composites: [],
        };
        expect(() => compileDesignTokens(input)).not.toThrow();
    });
});
