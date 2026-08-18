import { describe, expect, it } from "vitest";
import { prngFromSeed, randomInRange, randomInt } from "./cover-seed";

describe("prngFromSeed", () => {
    it("produces byte-for-byte the same sequence for the same seed", () => {
        const a = prngFromSeed("flowbus");
        const b = prngFromSeed("flowbus");
        const drawsA = Array.from({ length: 10 }, () => a());
        const drawsB = Array.from({ length: 10 }, () => b());
        expect(drawsA).toEqual(drawsB);
    });

    it("produces a different sequence for a different seed", () => {
        const a = prngFromSeed("flowbus");
        const b = prngFromSeed("testing-culture");
        expect(a()).not.toBe(b());
    });

    it("every draw stays within [0, 1)", () => {
        const prng = prngFromSeed("bounds-check");
        for (let i = 0; i < 500; i++) {
            const value = prng();
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });

    it("pins the exact known sequence for a fixed seed (golden values, computed once from this correct implementation)", () => {
        // A loose "stays in [0,1) and is deterministic" check (the tests
        // above) is satisfied by almost ANY internal arithmetic, including
        // a mutant that flips a `+` to `-` inside sfc32's state update —
        // the result is still a deterministic, in-range sequence, just a
        // DIFFERENT one. Pinning exact values is what actually exercises
        // the specific arithmetic.
        const prng = prngFromSeed("golden-seed-test");
        const draws = Array.from({ length: 5 }, () => prng());
        expect(draws).toEqual([
            0.4918421031907201,
            0.30425407947041094,
            0.5797204354312271,
            0.9267924558371305,
            0.21957697183825076,
        ]);
    });

    it("is sensitive to a single trailing character (avalanches, not just echoes the tail)", () => {
        const a = prngFromSeed("my-post-1");
        const b = prngFromSeed("my-post-2");
        const drawsA = Array.from({ length: 5 }, () => a());
        const drawsB = Array.from({ length: 5 }, () => b());
        expect(drawsA).not.toEqual(drawsB);
    });
});

describe("randomInRange", () => {
    it("stays within [min, max)", () => {
        const prng = prngFromSeed("range-check");
        for (let i = 0; i < 200; i++) {
            const value = randomInRange(prng, 10, 20);
            expect(value).toBeGreaterThanOrEqual(10);
            expect(value).toBeLessThan(20);
        }
    });
});

describe("randomInt", () => {
    it("stays within [min, max], inclusive of both ends", () => {
        const prng = prngFromSeed("int-check");
        const seen = new Set<number>();
        for (let i = 0; i < 500; i++) {
            const value = randomInt(prng, 3, 5);
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(3);
            expect(value).toBeLessThanOrEqual(5);
            seen.add(value);
        }
        // Over 500 draws every value in a tiny 3-wide range should show up at
        // least once — kills an off-by-one that silently excludes an end.
        expect(seen).toEqual(new Set([3, 4, 5]));
    });
});
