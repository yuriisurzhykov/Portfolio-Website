import { describe, expect, it } from "vitest";
import { nodeRadiusFor } from "./nodeRadius";

describe("nodeRadiusFor", () => {
    it("returns the minimum radius for a node with no connections", () => {
        expect(nodeRadiusFor(0)).toBe(20);
    });

    it("grows linearly with connection count below the cap", () => {
        expect(nodeRadiusFor(1)).toBe(25);
        expect(nodeRadiusFor(5)).toBe(45);
    });

    it("clamps at the maximum radius exactly at the boundary, not one step early or late", () => {
        // 20 + 5*5.2 = 46 is the mathematical crossover; 5 connections (45) must
        // NOT be clamped, 6 connections (which would be 50) MUST be.
        expect(nodeRadiusFor(5)).toBe(45);
        expect(nodeRadiusFor(6)).toBe(46);
        expect(nodeRadiusFor(20)).toBe(46);
    });
});
