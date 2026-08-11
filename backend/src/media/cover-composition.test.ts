import { describe, expect, it } from "vitest";
import { buildCoverComposition, COVER_HEIGHT, COVER_WIDTH, renderCoverSvg } from "./cover-composition";
import { prngFromSeed, randomInRange, type Prng } from "./cover-seed";

/** A `Prng` that replays a fixed, known sequence — see cover-palette.test.ts's identical helper. */
function sequencePrng(values: number[]): Prng {
    let index = 0;
    return () => values[index++ % values.length];
}

describe("buildCoverComposition", () => {
    it("pins the exact position/radius math at the PRNG's minimum draw (every draw returns 0)", () => {
        // A constant-0 Prng makes every `randomInRange(prng, min, max)` call
        // resolve to exactly `min` (min + 0*(max-min)) — the one sequence
        // simple enough to hand-verify unambiguously, and precise enough to
        // catch a `*` -> `/` mutant on cx/cy/r (dividing by COVER_WIDTH/
        // COVER_HEIGHT would land nowhere near these values).
        const composition = buildCoverComposition(0, sequencePrng([0]));

        expect(composition.spots).toHaveLength(3); // floor(3 + 0*(6-3)) = 3
        const [spot0] = composition.spots;
        expect(spot0.cx).toBeCloseTo(0.1 * COVER_WIDTH);
        expect(spot0.cy).toBeCloseTo(0.15 * COVER_HEIGHT);
        expect(spot0.r).toBeCloseTo(0.55 * COVER_WIDTH);
    });


    it("always produces between 3 and 5 spots", () => {
        // Off-by-one here would mean 0 spots (a valid-but-empty SVG, per
        // renderCoverSvg's own doc comment) or 6+ (visually overcrowded) —
        // swept across many seeds rather than asserted for one.
        for (let i = 0; i < 100; i++) {
            const composition = buildCoverComposition(180, prngFromSeed(`seed-${ i }`));
            expect(composition.spots.length).toBeGreaterThanOrEqual(3);
            expect(composition.spots.length).toBeLessThanOrEqual(5);
        }
    });

    it("keeps every spot's center within the canvas bounds", () => {
        for (let i = 0; i < 50; i++) {
            const composition = buildCoverComposition(90, prngFromSeed(`bounds-${ i }`));
            for (const spot of composition.spots) {
                expect(spot.cx).toBeGreaterThan(0);
                expect(spot.cx).toBeLessThan(COVER_WIDTH);
                expect(spot.cy).toBeGreaterThan(0);
                expect(spot.cy).toBeLessThan(COVER_HEIGHT);
                expect(spot.r).toBeGreaterThan(0);
            }
        }
    });

    it("is byte-for-byte deterministic for the same seed and hue", () => {
        const a = buildCoverComposition(45, prngFromSeed("flowbus"));
        const b = buildCoverComposition(45, prngFromSeed("flowbus"));
        expect(a).toEqual(b);
    });

    it("produces a different layout for a different seed", () => {
        const a = buildCoverComposition(45, prngFromSeed("flowbus"));
        const b = buildCoverComposition(45, prngFromSeed("testing-culture"));
        expect(a).not.toEqual(b);
    });
});

describe("renderCoverSvg", () => {
    it("is byte-for-byte deterministic end to end: (slug, hue) -> identical SVG", () => {
        const first = renderCoverSvg(buildCoverComposition(200, prngFromSeed("flowbus:1:1")));
        const second = renderCoverSvg(buildCoverComposition(200, prngFromSeed("flowbus:1:1")));
        expect(first).toBe(second);
    });

    it("produces a different SVG for a different variant of the same slug", () => {
        const variant1 = renderCoverSvg(buildCoverComposition(200, prngFromSeed("flowbus:1:1")));
        const variant2 = renderCoverSvg(buildCoverComposition(200, prngFromSeed("flowbus:1:2")));
        expect(variant1).not.toBe(variant2);
    });

    it("emits a well-formed, self-contained SVG document at the canonical OG size", () => {
        const svg = renderCoverSvg(buildCoverComposition(45, prngFromSeed("well-formed")));
        expect(svg).toMatch(/^<svg width="1200" height="630"/);
        expect(svg).toContain('viewBox="0 0 1200 630"');
        expect(svg.endsWith("</svg>")).toBe(true);
        // Deliberately absent — see this module's own top comment.
        expect(svg).not.toContain("feGaussianBlur");
        expect(svg).not.toContain("feTurbulence");
    });

    it("never throws for the degenerate zero-spot composition", () => {
        expect(() => renderCoverSvg({ base: "#101010", spots: [], grainSeed: 1 })).not.toThrow();
        const svg = renderCoverSvg({ base: "#101010", spots: [], grainSeed: 1 });
        expect(svg).toContain("#101010");
    });

    it("includes one gradient and one circle per spot", () => {
        const composition = buildCoverComposition(45, prngFromSeed("count-check"));
        const svg = renderCoverSvg(composition);
        expect((svg.match(/<radialGradient id="spot-/g) ?? []).length).toBe(composition.spots.length);
        expect((svg.match(/<circle cx=/g) ?? []).length).toBeGreaterThanOrEqual(composition.spots.length);
    });

    // Exact-string pin for a hand-built, fixed composition (one spot, fixed
    // grain seed) — kills the many "delete/blank one fragment of the
    // template-literal concatenation" mutants a structural
    // contains()/count() assertion alone can't see, since a blanked
    // fragment still leaves the OVERALL string "containing" everything the
    // other assertions above check for. The grain tile's own dots are
    // recomputed here independently, straight from `cover-seed.ts`'s own
    // primitives (already pinned by cover-seed.test.ts) — NOT by calling
    // `renderCoverSvg` a second time, which would just mutate identically
    // alongside the code under test and prove nothing about the grain path.
    function expectedGrainDots(grainSeed: number): string {
        const prng = prngFromSeed(String(grainSeed));
        let dots = "";
        for (let i = 0; i < 5; i++) {
            const cx = randomInRange(prng, 0.5, 9.5);
            const cy = randomInRange(prng, 0.5, 9.5);
            const opacity = randomInRange(prng, 0.02, 0.06);
            dots += `<circle cx="${ cx.toFixed(2) }" cy="${ cy.toFixed(2) }" r="0.6" fill="#ffffff" opacity="${ opacity.toFixed(3) }"/>`;
        }
        return dots;
    }

    it("renders the exact expected markup for a fixed, hand-built composition", () => {
        const svg = renderCoverSvg({
            base: "#101010",
            spots: [{ cx: 100, cy: 200, r: 300, color: "#ff0000" }],
            grainSeed: 42,
        });

        expect(svg).toBe(
            '<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">' +
            "<defs>" +
            '<radialGradient id="spot-0" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#ff0000" stop-opacity="0.9"/>' +
            '<stop offset="35%" stop-color="#ff0000" stop-opacity="0.6"/>' +
            '<stop offset="65%" stop-color="#ff0000" stop-opacity="0.28"/>' +
            '<stop offset="100%" stop-color="#ff0000" stop-opacity="0"/>' +
            "</radialGradient>" +
            `<pattern id="grain" width="10" height="10" patternUnits="userSpaceOnUse">${ expectedGrainDots(42) }</pattern>` +
            '<radialGradient id="vignette" cx="50%" cy="50%" r="72%">' +
            '<stop offset="55%" stop-color="#000000" stop-opacity="0"/>' +
            '<stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>' +
            "</radialGradient>" +
            "</defs>" +
            '<rect width="1200" height="630" fill="#101010"/>' +
            '<circle cx="100.00" cy="200.00" r="300.00" fill="url(#spot-0)"/>' +
            '<rect width="1200" height="630" fill="url(#grain)"/>' +
            '<rect width="1200" height="630" fill="url(#vignette)"/>' +
            "</svg>",
        );
    });

    it("escapes the double-quote that would otherwise break out of the attribute", () => {
        // The one character that actually matters for this attribute-value
        // injection risk: `>` alone inside an already-quoted attribute does
        // nothing special, but an unescaped `"` closes the attribute early.
        const svg = renderCoverSvg({ base: '#fff"><script>', spots: [], grainSeed: 1 });
        expect(svg).not.toContain('fill="#fff"><script>"');
        expect(svg).toContain('fill="#fff&quot;>&lt;script>"');
    });

    it("escapes XML-unsafe characters in a spot colour", () => {
        const svg = renderCoverSvg({ base: "#000", spots: [{ cx: 1, cy: 1, r: 1, color: "&<\"" }], grainSeed: 1 });
        expect(svg).toContain("&amp;&lt;&quot;");
    });
});
