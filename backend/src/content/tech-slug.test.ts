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
        expect(toTechSlug("JNI & C++")).toBe(toTechSlug("jni  c++"));
    });

    it("two genuinely different names do not collide", () => {
        expect(toTechSlug("Python")).not.toBe(toTechSlug("Python & Jinja2"));
    });

    // The review finding this function was changed for. Before the
    // SLUG_SYMBOL_WORDS table, `slugify` deleted the trailing punctuation
    // outright and BOTH of these became "c" — which then made
    // `uniqueTechSlugs` report one tech instead of two,
    // `filterWorkByTechSlug` return both languages' projects for a single
    // filter, and `findTechDisplayName` label the merged result with
    // whichever spelling came first.
    it("keeps 'C++' and 'C#' distinct from each other AND from plain 'C'", () => {
        expect(toTechSlug("C++")).toBe("c-plus-plus");
        expect(toTechSlug("C#")).toBe("c-sharp");
        expect(toTechSlug("C")).toBe("c");
        expect(new Set([toTechSlug("C++"), toTechSlug("C#"), toTechSlug("C")]).size).toBe(3);
    });

    it("spells the symbol out wherever it appears, not only at the end", () => {
        expect(toTechSlug("Notepad++")).toBe("notepad-plus-plus");
        expect(toTechSlug("C++/CLI")).toBe("c-plus-plus-cli");
    });

    it("leaves separator punctuation alone — those are NOT spelled out", () => {
        // Pins the deliberate smallness of SLUG_SYMBOL_WORDS: adding "&" or
        // "/" to it would break these, and they're the common case.
        expect(toTechSlug("Coroutines & Flow")).toBe("coroutines-flow");
        expect(toTechSlug("CI/CD")).toBe("ci-cd");
        expect(toTechSlug("Node.js")).toBe("node-js");
    });

    it("treats a name typed with the symbol spelled out as the same technology", () => {
        expect(toTechSlug("C plus plus")).toBe(toTechSlug("C++"));
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

    it("does not mix C++ and C# projects into one filter", () => {
        // The user-visible half of the slug-collision bug: with both names
        // slugging to "c", one `/work?tech=` filter returned both stacks.
        const languages = [{ stack: ["C++"] }, { stack: ["C#"] }, { stack: ["C"] }];
        expect(filterWorkByTechSlug(languages, toTechSlug("C++"))).toEqual([languages[0]]);
        expect(filterWorkByTechSlug(languages, toTechSlug("C#"))).toEqual([languages[1]]);
        expect(filterWorkByTechSlug(languages, toTechSlug("C"))).toEqual([languages[2]]);
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

    it("labels a C# filter 'C#', even when a C++ item comes first in the list", () => {
        // Ordering matters here on purpose: while both slugged to "c", the
        // C++ entry (first) won the label for a C# filter.
        const languages = [{ stack: ["C++"] }, { stack: ["C#"] }];
        expect(findTechDisplayName(languages, toTechSlug("C#"))).toBe("C#");
        expect(findTechDisplayName(languages, toTechSlug("C++"))).toBe("C++");
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

    it("counts C, C++ and C# as three technologies, not one", () => {
        // This set is what the landing page asks "is this logo clickable?"
        // against — collapsing it to one entry made two of the three logos
        // link to a filter that wasn't theirs.
        expect(uniqueTechSlugs([["C", "C++", "C#"]]).sort()).toEqual(["c", "c-plus-plus", "c-sharp"]);
    });
});
