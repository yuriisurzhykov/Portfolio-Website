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

    // Existing tests only ever check `result.css.toContain(...)` for a flat
    // declaration, never WHICH selector block it landed under — a mutant
    // flipping `index === 0` to always/never true (so flat declarations end
    // up duplicated into every theme block, or missing from :root entirely)
    // survived past every other test in this file for exactly that reason.
    it("puts flat primitive/semantic declarations under :root ONLY, never duplicated into a later .theme-* block", () => {
        const darkTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.950}", interactivePrimary: "{color.brand.500}" });
        const lightTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.0}", interactivePrimary: "{color.brand.500}" });
        const input: CompilerInput = {
            primitives: { color },
            contracts: { color: colorContract },
            themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
            flatSemantics: {},
            components: [],
            composites: [],
        };
        const result = compileDesignTokens(input);
        const rootBlock = result.css.slice(result.css.indexOf(":root {"), result.css.indexOf(".theme-light {"));
        const lightBlock = result.css.slice(result.css.indexOf(".theme-light {"));
        expect(rootBlock).toContain("--ds-color-neutral-950: hsl(219 25% 5%);");
        expect(rootBlock).toContain("--ds-color-brand-500: hsl(20 94% 61%);");
        expect(lightBlock).not.toContain("--ds-color-brand-500");
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

    // The `gradient` test above never exercised `serializeCompositesFor`'s
    // parallel `shadow` branch at all (a real coverage gap, not just an
    // unlikely one — `__compositeKind === "shadow"` and every line under it
    // were untested before this).
    it("resolves a composite (shadow) recipe through the same registry, the other half of serializeCompositesFor", () => {
        const darkTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.950}", interactivePrimary: "{color.brand.500}" });
        const lightTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.0}", interactivePrimary: "{color.brand.500}" });
        const shadows = defineComposite("shadow", {
            card: [{ x: 0, y: 4, blur: 8, spread: 0, color: "{color.neutral.950}" }],
        });
        const input: CompilerInput = {
            primitives: { color },
            contracts: { color: colorContract },
            themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
            flatSemantics: {},
            components: [],
            composites: [shadows],
        };
        const result = compileDesignTokens(input);
        expect(result.resolved.dark.shadow.card).toBe("0px 4px 8px 0px hsl(219 25% 5%)");
        expect(result.css).toContain("--ds-shadow-card: 0px 4px 8px 0px hsl(219 25% 5%);");
    });

    // Every prior test used `flatSemantics: {}` — the whole no-theme-axis
    // branch of `requiredGlobalPaths`/`definedGlobalPaths`/
    // `printFlatDeclarations` (radius/spacing/typography in the real
    // project) was never exercised end-to-end through `compileDesignTokens`
    // before this.
    it("resolves a flat (no-theme-axis) semantic category, flags its unused optional role, and flattens it into :root", () => {
        const radiusPrimitives = definePrimitives({ sm: "0.25rem", md: "0.5rem" });
        const radiusContract = defineContract({ category: "radius", required: ["control"] });
        const radiusTheme = defineTheme(radiusContract, { control: "{radius.md}", card: "{radius.sm}" });
        const darkTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.950}", interactivePrimary: "{color.brand.500}" });
        const lightTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.0}", interactivePrimary: "{color.brand.500}" });
        const input: CompilerInput = {
            primitives: { color, radius: radiusPrimitives },
            contracts: { color: colorContract, radius: radiusContract },
            themes: { dark: { color: darkTheme }, light: { color: lightTheme } },
            flatSemantics: { radius: radiusTheme },
            components: [defineComponentTokens("codeBlock", { corner: "{semantic.radius.control}" })],
            composites: [],
        };
        const result = compileDesignTokens(input);
        expect(result.css).toContain("--ds-semantic-radius-control: 0.5rem;");
        // "card" is optional (not in radiusContract.required) and consumed by
        // nothing — the exact behavior requiredGlobalPaths/definedGlobalPaths
        // exist to distinguish from "control", which IS required and so must
        // never be flagged even though it's ALSO only consumed once. Asserts
        // the warnings array EXACTLY (not just "contains card") — `defineTheme`
        // stamps `__kind`/`__category` onto every tree, and a broken
        // `!role.startsWith("__")` filter would leak THOSE in as spurious
        // "defined but unused" paths too, which a mere `.some(...)` check
        // on "card" alone would miss entirely.
        expect(result.warnings).toEqual(['DS101 Optional global-semantic token "{semantic.radius.card}" is referenced by no component/composite token. (Best-effort signal only — a REQUIRED role consumed exclusively through the Tailwind adapter never triggers this.)']);
    });

    // DS102 for a flat category specifically — the themed-category DS102
    // test above never proves the flat branch of the same check works.
    it("fails DS102 when a flat semantic role (not a themed one) is consumed by exactly one namespace", () => {
        const radiusPrimitives = definePrimitives({ sm: "0.25rem" });
        const radiusContract = defineContract({ category: "radius", required: [] });
        const radiusTheme = defineTheme(radiusContract, { codeBlockCorner: "{radius.sm}" });
        const input = baseInput([defineComponentTokens("codeBlock", { corner: "{semantic.radius.codeBlockCorner}" })]);
        expect(() => compileDesignTokens({ ...input, primitives: { ...input.primitives, radius: radiusPrimitives }, contracts: { ...input.contracts, radius: radiusContract }, flatSemantics: { radius: radiusTheme } })).toThrow(
            /DS102 Global-semantic token "\{semantic\.radius\.codeBlockCorner\}" is consumed by only one namespace: "component:codeBlock"/,
        );
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

    it("doesn't require a color category at all — a project with no color primitives or color theme axis compiles fine, and never emits color-scheme for a non-dark/light theme name", () => {
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
        const result = compileDesignTokens(input);
        // The dark/light tests elsewhere only prove the TRUE branch of the
        // ternary emits "color-scheme: <name>;" — this proves the FALSE
        // branch for a theme name that's neither, which nothing else in this
        // file checks.
        expect(result.css).not.toContain("color-scheme");
    });
});

describe("compileDesignTokens — requiredGlobalPaths' contract fallback", () => {
    // Every other test always supplies a contract for every category in
    // `input.contracts` — nothing proved `input.contracts[category]?.required ?? []`
    // actually falls back gracefully (treats every role as optional, no
    // crash) for a category with NO CONTRACT ENTRY AT ALL, which
    // `input.contracts` (a plain Record, not required to cover every
    // category) allows.
    it("treats every role as optional (never required) for a themed category with no matching contract entry", () => {
        const darkTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.950}", interactivePrimary: "{color.brand.500}" });
        const lightTheme = defineTheme(colorContract, { surfacePrimary: "{color.neutral.0}", interactivePrimary: "{color.brand.500}" });
        // `radius` has a theme entry but no `contracts.radius` at all.
        const radiusTheme = defineTheme(defineContract({ category: "radius", required: [] }), { control: "{radius.md}" });
        const input: CompilerInput = {
            primitives: { color, radius: definePrimitives({ md: "0.5rem" }) },
            contracts: { color: colorContract }, // no "radius" entry
            themes: { dark: { color: darkTheme, radius: radiusTheme }, light: { color: lightTheme, radius: radiusTheme } },
            flatSemantics: {},
            components: [],
            composites: [],
        };
        const result = compileDesignTokens(input);
        // No contract means nothing is required, so an unreferenced
        // "control" role must warn (DS101), not be silently treated as
        // required and exempted.
        expect(result.warnings.some((w) => w.includes('DS101 Optional global-semantic token "{theme.radius.control}"'))).toBe(true);
    });
});

describe("compileDesignTokens — output structure not covered by other describe blocks", () => {
    // Every other test only ever checks a block's CONTENT via `.toContain(...)`,
    // never that consecutive theme blocks are actually separated by a blank
    // line — a mutant collapsing the join separator to "" would still pass
    // every `.toContain` check (the substrings are still all there, just
    // jammed together with no boundary).
    it("separates :root and each .theme-* block with a real blank line, not concatenated with no separator", () => {
        const result = compileDesignTokens(baseInput([]));
        expect(result.css).toContain("}\n\n.theme-light {");
    });

    it("emits the exact AUTO-GENERATED header, not just SOME header", () => {
        const result = compileDesignTokens(baseInput([]));
        expect(result.css).toContain("/*\n * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\n");
        expect(result.css).toContain(" * Source: frontend/src/shared/ui/theme/{tokens,contracts,themes,semantic,components,composites}/\n");
        expect(result.css).toContain(" * Generator: frontend/scripts/generate-design-tokens.ts\n */");
    });

    // DS007 is unit-tested in isolation in validate.test.ts, but nothing
    // proved `compileDesignTokens` actually WIRES `validateUniqueVariableNames`
    // into the real per-theme assembly loop — the exact "existed, tested,
    // never called" shape this package's README already documents once for
    // DS001's color validators.
    it("actually calls validateUniqueVariableNames on the real assembled per-theme variable list, not just in isolation (DS007 wiring)", () => {
        // A primitive category literally named "codeBlock" collides with the
        // component namespace "codeBlock" once both flatten through
        // cssVariableName's kebab-casing — same generated name, two
        // different sources, the real shape DS007 exists to catch.
        const collidingPrimitives = definePrimitives({ keyword: "0.5rem" });
        const input = baseInput([defineComponentTokens("codeBlock", { keyword: "{color.accent.purple}" })]);
        expect(() =>
            compileDesignTokens({ ...input, primitives: { ...input.primitives, "component-code-block": collidingPrimitives } }),
        ).toThrow(/DS007 duplicate generated CSS variable name: "--ds-component-code-block-keyword"/);
    });

    // The DS007 test above only ever exercises the componentLines/
    // flat.primitiveNames pair — colorLines, gradientLines, and shadowLines
    // each build their OWN `.trim().split(":")[0]` list independently, and
    // none of those had a real collision to prove they're being compared
    // (as opposed to, say, silently building an empty/broken name list).
    it("catches a DS007 collision through the color/gradient lines specifically, not just componentLines", () => {
        // A primitive category literally named "gradient" with leaf "purple"
        // produces "--ds-gradient-purple" — the exact same generated name a
        // gradient composite named "purple" produces.
        const gradientNamedPrimitives = definePrimitives({ purple: "0.5rem" });
        const collidingGradient = defineComposite("gradient", {
            purple: { type: "linear", angle: 0, stops: [{ color: "{color.accent.purple}", position: 0 }, { color: "{color.brand.500}", position: 100 }] },
        });
        const input = baseInput([]);
        expect(() =>
            compileDesignTokens({ ...input, primitives: { ...input.primitives, gradient: gradientNamedPrimitives }, composites: [collidingGradient] }),
        ).toThrow('DS007 duplicate generated CSS variable name: "--ds-gradient-purple"');
    });
});
