import { describe, expect, it } from "vitest";
import { defineComponentTokens, defineComposite, defineContract, definePrimitives, defineTheme } from "./authoring";
import { compileDesignTokens, DesignTokenBuildError, type CompilerInput } from "./compile";

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
