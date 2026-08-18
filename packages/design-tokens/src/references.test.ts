import { describe, expect, it } from "vitest";
import { collectReferences, getByPath, resolveString, resolveTree, TokenReferenceError } from "./references";
import type { TokenTree } from "./types";

describe("getByPath", () => {
    it("resolves a nested dotted path", () => {
        expect(getByPath({ color: { brand: { 500: "hsl(20 94% 61%)" } } }, "color.brand.500")).toBe("hsl(20 94% 61%)");
    });

    it("returns undefined for a path that doesn't exist, never throws", () => {
        expect(getByPath({ color: {} }, "color.brand.500")).toBeUndefined();
        expect(getByPath({}, "a.b.c")).toBeUndefined();
    });

    // `typeof null === "object"` is the classic JS quirk that makes `current
    // == null || typeof current !== "object"` NOT collapse to just one half
    // — flipping the `||` to `&&` looks equivalent for a plain `undefined`
    // gap (both branches return `undefined`), but for an explicit `null`
    // value mid-path, `&&` fails to short-circuit and the very next line
    // throws "Cannot read properties of null" instead of gracefully
    // returning `undefined` — a real, observable difference, not a
    // rephrasing of the same test above.
    it("returns undefined (never throws) when an intermediate value is explicitly null, not just missing", () => {
        expect(getByPath({ color: null }, "color.brand")).toBeUndefined();
    });

    // The OTHER half of the same `||`: a truthy, non-null, non-object value
    // (a resolved scalar) reached partway through a path that has MORE
    // segments left — must stop and return undefined, not try to index into
    // a string/number.
    it("returns undefined when the path continues past a scalar leaf", () => {
        expect(getByPath({ color: { brand: { 500: "hsl(20 94% 61%)" } } }, "color.brand.500.oops")).toBeUndefined();
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

    it("resolves an alpha() call into hsl()'s own native alpha syntax, not color-mix()", () => {
        // Not color-mix(...) — Mermaid's color-math library can't parse that (a
        // real, live bug this fix corrects, not a style preference). hsl()'s own
        // `/ A%` alpha channel is visually identical and a plain, parseable value.
        expect(resolveString("alpha({color.brand.500}, 12%)", registry)).toBe("hsl(20 94% 61% / 12%)");
    });

    it("falls back to color-mix() only for the defensive case: a resolved value that isn't a plain hsl() string", () => {
        const weirdRegistry = { color: { weird: "rgb(1, 2, 3)" } };
        expect(resolveString("alpha({color.weird}, 12%)", weirdRegistry)).toBe("color-mix(in srgb, rgb(1, 2, 3) 12%, transparent)");
    });

    it("throws TokenReferenceError with the exact unresolvable path named in the message", () => {
        // Not just `.toThrow(TokenReferenceError)` — that only proves the
        // error TYPE, and would pass even if the message were blanked out.
        expect(() => resolveString("{color.brand.9999}", registry)).toThrow('Unresolvable token reference: "{color.brand.9999}"');
    });

    it("throws TokenReferenceError with the full circular chain named in the message, not just the word 'Circular'", () => {
        const circular = { theme: { color: { a: "{theme.color.b}", b: "{theme.color.a}" } } };
        expect(() => resolveString("{theme.color.a}", circular)).toThrow('Circular token reference at "theme.color.a" (chain: theme.color.a -> theme.color.b -> theme.color.a)');
    });

    it("throws TokenReferenceError when a reference resolves to a non-scalar value (an object, not a string/number)", () => {
        const objectRegistry = { color: { brand: { 500: { nested: "not a scalar" } } } };
        expect(() => resolveString("{color.brand.500}", objectRegistry)).toThrow('Token reference "color.brand.500" did not resolve to a scalar value (got object)');
    });

    it("leaves a plain literal untouched", () => {
        expect(resolveString("0.5rem", registry)).toBe("0.5rem");
    });

    it("does not blow up on the exact adversarial shape CodeQL flagged — many repeated, never-closed '{'", () => {
        // The real finding: TOKEN_REFERENCE has the `g` flag and no `^` anchor, so
        // `.replace()` retries the match at every character position on failure —
        // an unbounded `[^}]+` scanning to end-of-string at each of those O(n)
        // positions was genuinely O(n²). A real wall-clock bound, not just "it
        // returns something" — a regression here shows up as a hung test.
        const adversarial = "{{".repeat(50000);
        const start = performance.now();
        expect(resolveString(adversarial, registry)).toBe(adversarial);
        expect(performance.now() - start).toBeLessThan(500);
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

    // The array branch's `item && typeof item === "object" ? resolveTree(...) : item`
    // was only ever exercised with an array of ALL-objects before — a mixed
    // array (some plain scalars alongside object items) is the one shape
    // that actually distinguishes "recurse into objects, pass everything
    // else through" from "recurse into everything."
    it("resolves object items inside an array while passing plain scalar items through untouched", () => {
        const registry = { color: { brand: { 500: "hsl(20 94% 61%)" } } };
        const tree = { stops: [{ color: "{color.brand.500}" }, 50, "plain"] };
        expect(resolveTree(tree, registry)).toEqual({ stops: [{ color: "hsl(20 94% 61%)" }, 50, "plain"] });
    });

    // Neither a string, a number, an array, nor a plain object — the final
    // `else` branch (a boolean/null leaf) had zero coverage before this.
    // `TokenTree` itself doesn't admit boolean/null leaves (only
    // `ScalarToken | TokenTree | readonly unknown[]`), so this needs a cast
    // to even construct — but the runtime shape is real, not contrived: a
    // shadow composite's `ShadowLayer.inset?: boolean` flows through this
    // exact function via `serializeCompositesFor`'s `resolveTree(composite, ...)`
    // call on the whole layer tree, a real gap between this type and what
    // it's actually called with elsewhere in the package.
    it("passes a boolean/null leaf through untouched, the final else branch", () => {
        const registry = {};
        const tree = { inset: true, missing: null } as unknown as TokenTree;
        expect(resolveTree(tree, registry)).toEqual({ inset: true, missing: null });
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

    // The array branch (`Array.isArray(node)` -> `node.forEach(...)`) was
    // only ever exercised indirectly through a tree whose top-level shape
    // happened to be an object — nothing fed collectReferences an array
    // directly (a composite's `stops`/shadow-layers shape, in practice).
    it("finds references inside an array of objects, not just a plain object tree", () => {
        const tree = [{ color: "{color.brand.500}" }, { color: "{color.accent.purple}" }];
        expect([...collectReferences(tree)].sort()).toEqual(["color.accent.purple", "color.brand.500"]);
    });

    // The `key.startsWith("__")` skip inside the object branch: without a
    // key that's actually SHAPED like an authoring tag but ALSO holds a
    // reference-looking value, mutating the skip to `endsWith`/`false`
    // never changes the result (the real `__kind`/`__namespace` tags in the
    // other test are plain strings with no `{...}` inside them to find).
    it("skips a double-underscore-prefixed key even when its value looks like a reference", () => {
        const tree = { __namespace: "{not.a.real.ref}", real: "{color.brand.500}" };
        expect([...collectReferences(tree)]).toEqual(["color.brand.500"]);
    });

    it("does not blow up on the same adversarial shape via its matchAll() path", () => {
        // Same finding as resolveString's test above, the 3rd of the 3 flagged
        // call sites (isReferenceLike/.test(), resolveString/.replace(),
        // collectReferences/.matchAll() all shared the one unbounded TOKEN_REFERENCE).
        const start = performance.now();
        expect(collectReferences("{{".repeat(50000))).toEqual(new Set());
        expect(performance.now() - start).toBeLessThan(500);
    });
});
