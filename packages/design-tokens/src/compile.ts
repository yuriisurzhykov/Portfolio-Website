/**
 * The build-time-only orchestrator: assembles a registry per theme,
 * validates the whole graph (DS002/DS006/DS101/DS102/DS201/DS202), then
 * resolves and serializes. Nothing in this file is imported by anything
 * the app ships at runtime — see the plan's "adapters shouldn't re-run the
 * compiler at runtime" audit finding. A project's own
 * `scripts/generate-design-tokens.ts` is this function's only real caller.
 *
 * DS003 (illegal dependency direction — primitives must never reference a
 * theme/semantic/component/composite) has no runtime code here at all: a
 * `tokens/*.ts` file importing from `themes/`/`components/` would be a real
 * TypeScript circular-import error the moment it happened, so the type
 * system enforces it before this function ever runs.
 */
import { resolveTree } from "./references";
import { flattenScalars, cssVariableName } from "./serializers/css-value";
import { serializeGradient, validateGradientStops, type Gradient } from "./serializers/gradient";
import { serializeShadow, type ShadowLayer } from "./serializers/shadow";
import {
    findPrimitiveBoundaryCrossings,
    findSingleConsumerGlobals,
    findUnusedGlobalSemantics,
    type NamespacedTree,
} from "./usage-graph";
import { checkOptionalKeyParity, validateReferences, validateUniqueVariableNames } from "./validate";
import type { ComponentLayer, CompositeLayer, Contract, PrimitiveLayer, SemanticLayer, TokenTree } from "./types";

export interface CompilerInput {
    /** category name -> primitive tree, e.g. `{ color, dimension, radius, typography, motion }`. */
    readonly primitives: Readonly<Record<string, PrimitiveLayer<TokenTree>>>;
    /** category name -> the contract that category's semantic layer(s) satisfy — used to keep DS101 from flagging every required role as "unused" (required roles are meant to be consumed by the Tailwind adapter, not by another token). */
    readonly contracts: Readonly<Record<string, Contract<string>>>;
    /** theme name -> category name -> semantic tree — only categories WITH a theme axis belong here (color, for this project). */
    readonly themes: Readonly<Record<string, Readonly<Record<string, SemanticLayer<TokenTree>>>>>;
    /** category name -> semantic tree — categories with NO theme axis (radius, spacing, motion, typography). */
    readonly flatSemantics: Readonly<Record<string, SemanticLayer<TokenTree>>>;
    readonly components: readonly ComponentLayer<TokenTree>[];
    readonly composites: readonly CompositeLayer<TokenTree>[];
}

export interface CompileResult {
    readonly css: string;
    /** theme name -> fully-resolved plain data (no `{ref}` strings left) — the ONLY thing adapters (Mermaid/OG/WebGL) may import. */
    readonly resolved: Readonly<Record<string, ResolvedThemeData>>;
    readonly warnings: readonly string[];
}

export interface ResolvedThemeData {
    readonly color: Readonly<Record<string, unknown>>;
    readonly component: Readonly<Record<string, unknown>>;
    readonly gradient: Readonly<Record<string, string>>;
    readonly shadow: Readonly<Record<string, string>>;
}

export class DesignTokenBuildError extends Error {}

function buildRegistry(input: CompilerInput, themeName: string): Record<string, unknown> {
    return {
        ...input.primitives,
        theme: input.themes[themeName] ?? {},
        semantic: input.flatSemantics,
    };
}

function collectConsumers(input: CompilerInput): NamespacedTree[] {
    return [
        ...input.components.map((tree) => ({ namespace: `component:${tree.__namespace}`, tree })),
        ...input.composites.map((tree) => ({ namespace: `composite:${tree.__compositeKind}`, tree })),
    ];
}

function requiredGlobalPaths(input: CompilerInput): Set<string> {
    const paths = new Set<string>();
    for (const [themeName, categories] of Object.entries(input.themes)) {
        for (const category of Object.keys(categories)) {
            for (const role of input.contracts[category]?.required ?? []) {
                paths.add(`theme.${category}.${role}`);
            }
        }
        void themeName; // required-ness doesn't vary by theme; iterated for clarity only.
    }
    for (const [category, roles] of Object.entries(input.flatSemantics)) {
        for (const role of input.contracts[category]?.required ?? []) {
            paths.add(`semantic.${category}.${role}`);
        }
    }
    return paths;
}

function definedGlobalPaths(input: CompilerInput): string[] {
    const paths: string[] = [];
    for (const categories of Object.values(input.themes)) {
        for (const [category, roles] of Object.entries(categories)) {
            for (const role of Object.keys(roles)) {
                if (!role.startsWith("__")) paths.push(`theme.${category}.${role}`);
            }
        }
    }
    for (const [category, roles] of Object.entries(input.flatSemantics)) {
        for (const role of Object.keys(roles)) {
            if (!role.startsWith("__")) paths.push(`semantic.${category}.${role}`);
        }
    }
    return [...new Set(paths)];
}

/** Runs every graph-wide check (DS002, DS006, DS101 warn, DS102/DS201/DS202 error). Throws on the first error-level violation; returns accumulated warnings otherwise. */
export function validateDesignTokens(input: CompilerInput): { readonly warnings: readonly string[] } {
    const warnings: string[] = [];
    const themeNames = Object.keys(input.themes);
    const consumers = collectConsumers(input);

    const roots: TokenTree[] = [...Object.values(input.flatSemantics), ...input.components, ...input.composites];
    for (const themeName of themeNames) {
        const registry = buildRegistry(input, themeName);
        validateReferences(registry, [...roots, ...Object.values(input.themes[themeName])]);
    }

    const categories = new Set(Object.values(input.themes).flatMap((c) => Object.keys(c)));
    const required = new Set([...requiredGlobalPaths(input)].map((p) => p.split(".")[2]));
    for (const category of categories) {
        const perTheme: Record<string, TokenTree> = {};
        for (const themeName of themeNames) {
            const roles = input.themes[themeName][category];
            if (roles) perTheme[themeName] = roles;
        }
        warnings.push(...checkOptionalKeyParity(perTheme, required));
    }

    const crossings = findPrimitiveBoundaryCrossings(consumers);
    if (crossings.length > 0) {
        throw new DesignTokenBuildError(
            crossings
                .map(
                    (crossing) =>
                        `DS201 Primitive "${crossing.primitivePath}" crosses component/composite domain boundaries.\n` +
                        `  Consumers:\n${crossing.consumers.map((c) => `    - ${c}`).join("\n")}\n` +
                        "  Decide: promote to a global-semantic role, OR keep both as independent tokens if this is coincidence, not shared meaning.",
                )
                .join("\n\n"),
        );
    }

    // Same exclusion as DS101 below, for the same reason: a REQUIRED role's real
    // reason to be global is that Tailwind/JSX consume it directly across many
    // files — invisible to this token-to-token graph — so having only one
    // component/composite reference it in the graph doesn't mean it should be
    // demoted; an OPTIONAL role with a single consumer very much does.
    const requiredPathsForDS102 = requiredGlobalPaths(input);
    const singleConsumers = findSingleConsumerGlobals(consumers).filter((violation) => !requiredPathsForDS102.has(violation.semanticPath));
    if (singleConsumers.length > 0) {
        throw new DesignTokenBuildError(
            singleConsumers
                .map(
                    (violation) =>
                        `DS102 Global-semantic token "{${violation.semanticPath}}" is consumed by only one namespace: "${violation.consumer}".\n` +
                        "  Move it to a component token instead, and reference a primitive directly.",
                )
                .join("\n\n"),
        );
    }

    const requiredPaths = requiredGlobalPaths(input);
    const unused = findUnusedGlobalSemantics(
        definedGlobalPaths(input).filter((path) => !requiredPaths.has(path)),
        consumers,
    );
    warnings.push(
        ...unused.map(
            (path) =>
                `DS101 Optional global-semantic token "{${path}}" is referenced by no component/composite token. ` +
                "(Best-effort signal only — a REQUIRED role consumed exclusively through the Tailwind adapter never triggers this.)",
        ),
    );

    return { warnings };
}

function serializeCompositesFor(composites: readonly CompositeLayer<TokenTree>[], registry: Record<string, unknown>): { gradientLines: string[]; shadowLines: string[]; gradients: Record<string, string>; shadows: Record<string, string> } {
    const gradientLines: string[] = [];
    const shadowLines: string[] = [];
    const gradients: Record<string, string> = {};
    const shadows: Record<string, string> = {};
    for (const composite of composites) {
        if (composite.__compositeKind === "gradient") {
            const resolved = resolveTree(composite, registry) as unknown as Record<string, Gradient>;
            validateGradientStops(resolved);
            for (const [name, gradient] of Object.entries(resolved)) {
                const value = serializeGradient(gradient);
                gradients[name] = value;
                gradientLines.push(`    ${cssVariableName(["gradient"], [name])}: ${value};`);
            }
        } else if (composite.__compositeKind === "shadow") {
            const resolved = resolveTree(composite, registry) as unknown as Record<string, readonly ShadowLayer[]>;
            for (const [name, layers] of Object.entries(resolved)) {
                const value = serializeShadow(layers);
                shadows[name] = value;
                shadowLines.push(`    ${cssVariableName(["shadow"], [name])}: ${value};`);
            }
        }
    }
    return { gradientLines, shadowLines, gradients, shadows };
}

function serializeComponentsFor(components: readonly ComponentLayer<TokenTree>[], registry: Record<string, unknown>): { lines: string[]; data: Record<string, unknown> } {
    const lines: string[] = [];
    const data: Record<string, unknown> = {};
    for (const component of components) {
        const resolved = resolveTree(component, registry);
        data[component.__namespace] = resolved;
        for (const [path, value] of flattenScalars(resolved)) {
            lines.push(`    ${cssVariableName(["component", component.__namespace], path)}: ${value};`);
        }
    }
    return { lines, data };
}

function printFlatDeclarations(input: CompilerInput): { lines: string[]; primitiveNames: string[] } {
    const lines: string[] = [];
    const names: string[] = [];
    for (const [category, tree] of Object.entries(input.primitives)) {
        for (const [path, value] of flattenScalars(tree)) {
            const name = cssVariableName([category], path);
            names.push(name);
            lines.push(`    ${name}: ${value};`);
        }
    }
    // `["semantic", category]`, not `[category]` — found live: a flat category's
    // primitive tier and semantic tier can name a leaf identically (radius's
    // primitive `pill` step and its semantic `pill` ROLE both flattened to
    // "radius-pill", tripping DS007 the first time this ran for real). Color's
    // theme roles don't need the same prefix (empirically confirmed by the same
    // DS007 check never firing for color, and it would deviate from
    // ARCHITECTURE.md's already-accepted `--ds-color-*` contract for no reason).
    const registry = { ...input.primitives, semantic: input.flatSemantics };
    for (const [category, tree] of Object.entries(input.flatSemantics)) {
        const resolved = resolveTree(tree, registry);
        for (const [path, value] of flattenScalars(resolved)) {
            const name = cssVariableName(["semantic", category], path);
            names.push(name);
            lines.push(`    ${name}: ${value};`);
        }
    }
    return { lines, primitiveNames: names };
}

export function compileDesignTokens(input: CompilerInput): CompileResult {
    const { warnings } = validateDesignTokens(input);

    const flat = printFlatDeclarations(input);
    const resolved: Record<string, ResolvedThemeData> = {};
    const themeBlocks: string[] = [];
    const themeNames = Object.keys(input.themes);

    themeNames.forEach((themeName, index) => {
        const registry = buildRegistry(input, themeName);
        const colorTree = input.themes[themeName].color ?? {};
        const resolvedColor = resolveTree(colorTree, registry);
        const colorLines = flattenScalars(resolvedColor).map(([path, value]) => `    ${cssVariableName(["color"], path)}: ${value};`);
        const { gradientLines, shadowLines, gradients, shadows } = serializeCompositesFor(input.composites, registry);
        const { lines: componentLines, data: componentData } = serializeComponentsFor(input.components, registry);

        resolved[themeName] = {
            color: resolvedColor as Record<string, unknown>,
            component: componentData,
            gradient: gradients,
            shadow: shadows,
        };

        validateUniqueVariableNames([
            ...flat.primitiveNames,
            ...colorLines.map((line) => line.trim().split(":")[0]),
            ...gradientLines.map((line) => line.trim().split(":")[0]),
            ...shadowLines.map((line) => line.trim().split(":")[0]),
            ...componentLines.map((line) => line.trim().split(":")[0]),
        ]);

        // `color-scheme` is a real CSS property, not a `--ds-*` custom one, and the browser only
        // understands the literal values "light"/"dark" — emitted only when a theme is actually
        // named one of those (true for this project's dark/light) rather than guessed from index
        // order, so an exotic multi-theme project just doesn't get a (possibly wrong) declaration.
        const colorScheme = themeName === "dark" || themeName === "light" ? `\n    color-scheme: ${themeName};` : "";
        const declarationLines = [...colorLines, ...gradientLines, ...shadowLines, ...componentLines];
        const selector = index === 0 ? ":root" : `.theme-${themeName}`;
        const body = index === 0 ? [...flat.lines, ...declarationLines].join("\n") : declarationLines.join("\n");
        themeBlocks.push(`${selector} {\n${body}${colorScheme}\n}`);
    });

    const header = "/*\n * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\n"
        + " * Source: frontend/src/shared/ui/theme/{tokens,contracts,themes,semantic,components,composites}/\n"
        + " * Generator: frontend/scripts/generate-design-tokens.ts\n */";

    return { css: [header, ...themeBlocks].join("\n\n"), resolved, warnings };
}
