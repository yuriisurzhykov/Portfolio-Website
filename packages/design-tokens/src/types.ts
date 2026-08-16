/**
 * Core, project-agnostic shapes. Nothing in this file (or anywhere else in
 * this package) knows a concrete role name like "surfacePrimary" — that
 * vocabulary is always supplied by a consuming project through the
 * authoring API (see authoring.ts). This file only describes the SHAPE
 * every layer takes, not its content.
 */

export type ScalarToken = string | number;

export type TokenTree = {
    readonly [key: string]: ScalarToken | TokenTree | readonly unknown[];
};

/**
 * Every object produced by the authoring API (definePrimitives/defineTheme/
 * defineComponentTokens/defineComposite) carries one of these tags. The
 * compiler's usage-graph reads layer membership off the object itself —
 * never off which folder a source file happened to live in.
 */
export type TokenKind = "primitive" | "semantic" | "component" | "composite";

export interface PrimitiveTag {
    readonly __kind: "primitive";
}

export interface SemanticTag {
    readonly __kind: "semantic";
    readonly __category: string;
}

export interface ComponentTag {
    readonly __kind: "component";
    readonly __namespace: string;
}

export interface CompositeTag {
    readonly __kind: "composite";
    readonly __compositeKind: string;
}

export type PrimitiveLayer<T extends TokenTree> = T & PrimitiveTag;
export type SemanticLayer<T extends TokenTree> = T & SemanticTag;
export type ComponentLayer<T extends TokenTree> = T & ComponentTag;
export type CompositeLayer<T extends TokenTree> = T & CompositeTag;

export type AnyTaggedLayer = PrimitiveLayer<TokenTree> | SemanticLayer<TokenTree> | ComponentLayer<TokenTree> | CompositeLayer<TokenTree>;

/**
 * A contract is the ONE place a project's required-role list lives —
 * `RequiredShape<>` below derives the matching TS type from the same
 * `required` array a `defineContract()` call produces, so there is never a
 * hand-kept-in-sync interface alongside a hand-kept-in-sync runtime list.
 */
export interface Contract<TRequired extends string = string> {
    readonly category: string;
    readonly required: readonly TRequired[];
}

export type RequiredShape<C> = C extends Contract<infer TRequired> ? Record<TRequired, ScalarToken> : never;

export type DeepPartial<T> = T extends TokenTree
    ? { readonly [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/**
 * Branded reference-shape types — these validate that a string LOOKS like a
 * reference into the right layer, never that the path it names actually
 * EXISTS. `"{color.brand.9999}"` still satisfies `PrimitiveRef<"color">`
 * even if step 9999 was never defined — only the build-time graph validator
 * (validate.ts / usage-graph.ts) catches that. Don't oversell this layer as
 * full enforcement; it's an IDE-time guardrail, not the real gate.
 */
export type PrimitiveRef<Category extends string = string> = `{${Category}.${string}}`;
export type GlobalSemanticRef = `{theme.${string}}` | `{semantic.${string}}`;
export type AlphaRef<Category extends string = string> = `alpha({${Category}.${string}}, ${number}%)`;
export type ComponentRef<Category extends string = string> = PrimitiveRef<Category> | GlobalSemanticRef | AlphaRef<Category>;
