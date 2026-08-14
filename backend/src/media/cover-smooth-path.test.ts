import { describe, expect, it } from "vitest";
import { smoothPath } from "./cover-smooth-path";

describe("smoothPath", () => {
    it("returns an empty string for zero or one point (nothing to draw a curve through)", () => {
        expect(smoothPath([])).toBe("");
        expect(smoothPath([{ x: 1, y: 1 }])).toBe("");
    });

    it("pins the exact path string for two points (a single Bezier segment)", () => {
        expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBe(
            "M 0.00 0.00 C 1.67 0.00, 8.33 0.00, 10.00 0.00",
        );
    });

    it("pins the exact path string for three points (two chained Bezier segments)", () => {
        expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 0 }])).toBe(
            "M 0.00 0.00 C 1.67 0.83, 6.67 5.00, 10.00 5.00 C 13.33 5.00, 18.33 0.83, 20.00 0.00",
        );
    });

    it("pins the exact control-point math when the FIRST point is not the origin (kills a +/- sign mutant on p0)", () => {
        // With a zero-valued first point, `(p2 - p0)` and `(p2 + p0)` are
        // indistinguishable (both equal p2). A non-zero starting point is
        // what actually exercises the SIGN of the p0/p3 terms in the
        // control-point formula.
        expect(smoothPath([{ x: 5, y: 3 }, { x: 10, y: 5 }, { x: 20, y: 0 }])).toBe(
            "M 5.00 3.00 C 5.83 3.33, 7.50 5.50, 10.00 5.00 C 12.50 4.50, 18.33 0.83, 20.00 0.00",
        );
    });

    it("always starts with an M command at the exact first point", () => {
        expect(smoothPath([{ x: 42, y: 7 }, { x: 100, y: 100 }])).toMatch(/^M 42\.00 7\.00 /);
    });

    it("passes exactly through every input point (each appears as a Bezier segment's endpoint)", () => {
        const points = [{ x: 0, y: 0 }, { x: 50, y: 25 }, { x: 100, y: 0 }, { x: 150, y: 25 }];
        const path = smoothPath(points);
        for (const point of points.slice(1)) {
            expect(path).toContain(`${ point.x.toFixed(2) } ${ point.y.toFixed(2) }`);
        }
    });

    it("produces one fewer Bezier ('C') command than there are points", () => {
        const points = Array.from({ length: 6 }, (_, i) => ({ x: i * 10, y: 0 }));
        const path = smoothPath(points);
        expect((path.match(/C /g) ?? []).length).toBe(points.length - 1);
    });

    it("is a pure function: identical points always produce an identical path", () => {
        const points = [{ x: 3, y: 4 }, { x: 30, y: 40 }, { x: 300, y: 5 }];
        expect(smoothPath(points)).toBe(smoothPath(points));
    });
});
