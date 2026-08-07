import { describe, expect, it } from "vitest";
import { filterWorkByTechSlug, findTechDisplayName, toSimpleIconSlug, toTechSlug, uniqueTechSlugs } from "./tech-slug";

describe("toTechSlug", () => {
    it("lowercases and hyphenates a multi-word name", () => {
        expect(toTechSlug("Jetpack Compose")).toBe("jetpack-compose");
    });

    it("collapses punctuation and repeated whitespace into a single hyphen", () => {
        expect(toTechSlug("Coroutines & Flow")).toBe("coroutines-flow");
        expect(toTechSlug("  Jetpack   Compose  ")).toBe("jetpack-compose");
    });

    it("two differently-formatted spellings of the same name produce the same slug", () => {
        expect(toTechSlug("JNI & C++")).toBe(toTechSlug("jni-c"));
    });

    it("two genuinely different names do not collide", () => {
        expect(toTechSlug("Python")).not.toBe(toTechSlug("Python & Jinja2"));
    });
});

describe("toSimpleIconSlug", () => {
    it("uses the hand-verified alias for a punctuation-heavy brand name", () => {
        expect(toSimpleIconSlug("C++")).toBe("cplusplus");
        expect(toSimpleIconSlug("C#")).toBe("csharp");
    });

    it("alias lookup is case-insensitive", () => {
        expect(toSimpleIconSlug("Node.js")).toBe("nodedotjs");
        expect(toSimpleIconSlug("NODE.JS")).toBe("nodedotjs");
    });

    it("trims surrounding whitespace before the alias lookup", () => {
        expect(toSimpleIconSlug("  Node.js  ")).toBe("nodedotjs");
    });

    it("falls back to stripping punctuation/whitespace for a mechanically-derivable name", () => {
        expect(toSimpleIconSlug("PostgreSQL")).toBe("postgresql");
        expect(toSimpleIconSlug("Jetpack Compose")).toBe("jetpackcompose");
    });
});

describe("filterWorkByTechSlug", () => {
    const items = [
        { stack: ["Kotlin", "Jetpack Compose"] },
        { stack: ["TypeScript", "React"] },
        { stack: ["Python"] },
    ];

    it("matches an item whose stack contains the slug, regardless of the original spelling", () => {
        expect(filterWorkByTechSlug(items, "jetpack-compose")).toEqual([items[0]]);
    });

    it("matches by normalized slug, not exact string equality", () => {
        // "React" normalizes to "react" — a literal string-equality check
        // (rather than slug comparison) would fail this the same way it
        // would fail on case/whitespace differences elsewhere.
        expect(filterWorkByTechSlug(items, "react")).toEqual([items[1]]);
    });

    it("returns an empty array when no item's stack matches", () => {
        expect(filterWorkByTechSlug(items, "rust")).toEqual([]);
    });

    it("does not match a slug that is only a substring of a real entry", () => {
        // Guards against an accidental `.includes()`-style implementation:
        // "react" must not match "reactive-streams".
        const withDecoy = [...items, { stack: ["Reactive Streams"] }];
        expect(filterWorkByTechSlug(withDecoy, "react")).toEqual([items[1]]);
    });
});

describe("findTechDisplayName", () => {
    const items = [{ stack: ["Kotlin", "Jetpack Compose"] }, { stack: ["Python"] }];

    it("returns the original spelling for a matching slug", () => {
        expect(findTechDisplayName(items, "jetpack-compose")).toBe("Jetpack Compose");
    });

    it("returns null when no item's stack matches the slug", () => {
        expect(findTechDisplayName(items, "rust")).toBeNull();
    });

    it("returns the first item's spelling, not a later duplicate with different casing", () => {
        const withDuplicate = [{ stack: ["kotlin"] }, ...items];
        expect(findTechDisplayName(withDuplicate, "kotlin")).toBe("kotlin");
    });
});

describe("uniqueTechSlugs", () => {
    it("returns an empty array for no stacks", () => {
        expect(uniqueTechSlugs([])).toEqual([]);
    });

    it("dedupes the same technology spelled identically across items", () => {
        const slugs = uniqueTechSlugs([["Kotlin", "Jetpack Compose"], ["Kotlin"]]);
        expect(slugs.sort()).toEqual(["jetpack-compose", "kotlin"]);
    });

    it("keeps two genuinely different technologies distinct", () => {
        const slugs = uniqueTechSlugs([["Kotlin"], ["Python"]]);
        expect(slugs.sort()).toEqual(["kotlin", "python"]);
    });
});
