import { describe, expect, it } from "vitest";
import { findClosestSuggestion, fuzzyMatchScore, fuzzySearch } from "./fuzzy-match";

describe("fuzzyMatchScore", () => {
    it("returns null when a query character is missing from the target entirely", () => {
        expect(fuzzyMatchScore("xyz", "Jetpack Compose")).toBeNull();
    });

    it("returns null when characters exist but not in order", () => {
        expect(fuzzyMatchScore("tj", "Jetpack")).toBeNull();
    });

    it("returns 0 for an empty query against any target", () => {
        expect(fuzzyMatchScore("", "Jetpack Compose")).toBe(0);
        expect(fuzzyMatchScore("   ", "Jetpack Compose")).toBe(0);
    });

    it("matches an abbreviation across word boundaries ('jc' -> 'Jetpack Compose')", () => {
        expect(fuzzyMatchScore("jc", "Jetpack Compose")).not.toBeNull();
    });

    it("ranks a contiguous, word-start match higher than a scattered one", () => {
        // "jet" matches "Jetpack" contiguously at its start; also matches
        // "Java Enterprise Tools" only as scattered word-initials.
        const contiguous = fuzzyMatchScore("jet", "Jetpack Compose");
        const scattered = fuzzyMatchScore("jet", "Java Enterprise Tools");
        expect(contiguous).not.toBeNull();
        expect(scattered).not.toBeNull();
        expect(contiguous!).toBeGreaterThan(scattered!);
    });

    it("ranks an earlier match position higher than an otherwise-identical later one", () => {
        const early = fuzzyMatchScore("a", "az");
        const late = fuzzyMatchScore("a", "za");
        expect(early!).toBeGreaterThan(late!);
    });

    it("is case-insensitive", () => {
        expect(fuzzyMatchScore("KOTLIN", "kotlin")).toBe(fuzzyMatchScore("kotlin", "kotlin"));
    });

    // Golden, hand-computed exact values (verified by actually running the
    // formula, not just eyeballing it) — pins the scoring constants (+10
    // per match, +4 per point of consecutive run, +8 word-start bonus, the
    // two `* 0.5`/`* 0.1` tie-breaker penalties) themselves, not just their
    // relative ordering. A test that only checks "A ranks above B" leaves
    // every one of these constants free to be scaled, flipped, or dropped
    // as long as the relative order happens to survive — these don't.
    it("computes the exact score for a fully contiguous, all-word-start match ('ab' in 'ab')", () => {
        // char 'a': +10 base, consecutiveRun 1 -> +4, word-start -> +8 = 22
        // char 'b': +10 base, consecutiveRun 2 -> +8, not word-start = 18
        // no tie-breaker penalty: firstMatchIndex=0, equal lengths.
        expect(fuzzyMatchScore("ab", "ab")).toBe(40);
    });

    it("computes the exact score isolating the length-difference tie-breaker penalty ('a' in 'ab')", () => {
        // char 'a': +10 base +4 (run=1) +8 (word-start) = 22, firstMatchIndex=0 (no penalty).
        // length penalty: (2 - 1) * 0.1 = 0.1 -> 22 - 0.1 = 21.9.
        expect(fuzzyMatchScore("a", "ab")).toBeCloseTo(21.9, 5);
    });

    it("computes the exact score isolating the first-match-position tie-breaker penalty ('b' in 'ab')", () => {
        // char 'b' found at index 1: +10 +4 (run=1) +0 (not word-start) = 14.
        // firstMatchIndex penalty: 1 * 0.5 = 0.5 -> 13.5; length penalty: (2-1)*0.1=0.1 -> 13.4.
        expect(fuzzyMatchScore("b", "ab")).toBeCloseTo(13.4, 5);
    });

    it("only sets the first-match-position penalty from the FIRST match, not a later repeat of the same character ('oo' in 'foo')", () => {
        // char 1 'o' at index 1: +10 +4 (run=1) +0 = 14. firstMatchIndex := 1.
        // char 2 'o' at index 2: +10 +8 (run=2, consecutive) +0 = 18. firstMatchIndex stays 1 (not re-assigned to 2).
        // total 32; penalties: 1*0.5=0.5 -> 31.5; (3-2)*0.1=0.1 -> 31.4.
        expect(fuzzyMatchScore("oo", "foo")).toBeCloseTo(31.4, 5);
    });

    it("only checks the character strictly BEFORE a match for a word boundary, not the one after ('b' in 'a-b')", () => {
        // 'b' at index 2, preceded by '-' (a word-boundary char) -> word-start bonus applies: +10 +4 +8 = 22.
        // firstMatchIndex penalty: 2*0.5=1 -> 21; length penalty: (3-1)*0.1=0.2 -> 20.8.
        expect(fuzzyMatchScore("b", "a-b")).toBeCloseTo(20.8, 5);
    });
});

describe("fuzzySearch", () => {
    const candidates = ["Kotlin", "Jetpack Compose", "Coroutines & Flow", "Python & Jinja2"];

    it("returns the first `limit` candidates, unranked, for an empty query", () => {
        expect(fuzzySearch("", candidates, 2)).toEqual(["Kotlin", "Jetpack Compose"]);
    });

    it("finds a real abbreviation match and excludes unrelated candidates", () => {
        const results = fuzzySearch("jc", candidates);
        expect(results).toContain("Jetpack Compose");
        expect(results).not.toContain("Python & Jinja2");
    });

    it("re-sorts a worse-ranked candidate that appears FIRST in the input list behind a better-ranked one that appears second — proves sorting actually runs, not just filtering", () => {
        // "Java Enterprise Tools" only matches "jet" as scattered word
        // initials; "Jetpack Compose" matches it as a contiguous,
        // word-start prefix — strictly higher score. Listed in the WORSE
        // order on purpose: an implementation that dropped `.sort()` would
        // return them in this same (wrong) input order.
        const results = fuzzySearch("jet", ["Java Enterprise Tools", "Jetpack Compose"]);
        expect(results).toEqual(["Jetpack Compose", "Java Enterprise Tools"]);
    });

    it("respects the limit", () => {
        expect(fuzzySearch("o", candidates, 1)).toHaveLength(1);
    });

    it("returns an empty array when nothing matches", () => {
        expect(fuzzySearch("xyz123", candidates)).toEqual([]);
    });
});

describe("findClosestSuggestion", () => {
    const suggestions = ["Kotlin", "Jetpack Compose", "Python & Jinja2"];

    it("suggests a fuller entry when the typed value is a substring of it", () => {
        expect(findClosestSuggestion("Python", suggestions)).toBe("Python & Jinja2");
    });

    it("returns null when the value already exactly matches a suggestion (case-insensitive)", () => {
        expect(findClosestSuggestion("kotlin", suggestions)).toBeNull();
        expect(findClosestSuggestion("Kotlin", suggestions)).toBeNull();
    });

    it("returns null when nothing is a substring match either way", () => {
        expect(findClosestSuggestion("React", suggestions)).toBeNull();
    });

    it("returns null for an empty value", () => {
        expect(findClosestSuggestion("", suggestions)).toBeNull();
    });

    it("trims surrounding whitespace before comparing", () => {
        expect(findClosestSuggestion("  Python  ", suggestions)).toBe("Python & Jinja2");
    });

    it("matches in the other direction too — a suggestion that is a substring of the typed value", () => {
        expect(findClosestSuggestion("Kotlin Coroutines", ["Kotlin"])).toBe("Kotlin");
    });
});
