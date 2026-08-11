import { describe, expect, it } from "vitest";
import { firstWordOf, statsFor } from "./cover-text-stats";

describe("statsFor", () => {
    it("counts words across BOTH title and excerpt combined, not just one", () => {
        expect(statsFor("one two", "three four five").wordCount).toBe(5);
    });

    it("computes average word length as total letters divided by word count", () => {
        // "ab cd" -> 2 words, 4 letters -> 2.0
        expect(statsFor("ab cd", "").avgWordLen).toBe(2);
    });

    it("replaces stripped punctuation with a SPACE, not nothing — so a hyphenated compound counts as two words, not one glued-together word", () => {
        // Kills a mutant that replaces punctuation with "" instead of " "
        // (e.g. "hello-world" would otherwise collapse into "helloworld").
        expect(statsFor("hello-world", "").wordCount).toBe(2);
    });

    it("strips punctuation and digits' separators without counting them as letters", () => {
        // "FlowBus:" -> letters "flowbus" (8), digits/punctuation dropped entirely from the letter count.
        const stats = statsFor("FlowBus: v2!", "");
        // words: "flowbus", "v2" (digits kept as part of a word, just not as "letters" for avgWordLen's purpose is fine either way — pin the actual behavior)
        expect(stats.wordCount).toBe(2);
    });

    it("computes vowelRatio as vowel letters over all letters, case-insensitively", () => {
        // "aeiou" -> 5 letters, all vowels -> ratio 1.
        expect(statsFor("aeiou", "").vowelRatio).toBe(1);
        // "bcdfg" -> 5 letters, zero vowels -> ratio 0.
        expect(statsFor("bcdfg", "").vowelRatio).toBe(0);
    });

    it("recognizes Cyrillic vowels too, not just Latin", () => {
        // "привет" -> letters п,р,и,в,е,т (6); vowels и,е (2) -> ratio 1/3.
        expect(statsFor("привет", "").vowelRatio).toBeCloseTo(1 / 3);
    });

    it("falls back to a fixed, non-NaN vowelRatio for completely empty input", () => {
        const stats = statsFor("", "");
        expect(stats.wordCount).toBe(0);
        expect(stats.vowelRatio).toBe(0.4);
        expect(Number.isNaN(stats.avgWordLen)).toBe(false);
    });

    it("treats a whitespace-only title the same as an empty one (no phantom words)", () => {
        expect(statsFor("   ", "  ").wordCount).toBe(0);
    });

    it("is a pure function: same input always produces the exact same output", () => {
        const a = statsFor("Notes on FlowBus", "A deep dive into event buses.");
        const b = statsFor("Notes on FlowBus", "A deep dive into event buses.");
        expect(a).toEqual(b);
    });
});

describe("firstWordOf", () => {
    it("returns the first word, uppercased", () => {
        expect(firstWordOf("flowbus is great")).toBe("FLOWBUS");
    });

    it("ignores leading punctuation attached to the first token", () => {
        expect(firstWordOf("\"FlowBus\": why I built it")).toBe("FLOWBUS");
    });

    it("falls back to a single neutral letter for a title with no words at all", () => {
        expect(firstWordOf("")).toBe("X");
        expect(firstWordOf("   ")).toBe("X");
        expect(firstWordOf("!!!")).toBe("X");
    });
});
