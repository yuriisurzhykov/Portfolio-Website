import { describe, expect, it } from "vitest";
import { buildCoverComposition, COVER_HEIGHT, COVER_WIDTH, renderCoverSvg, type CoverComposition, type CoverCompositionInput } from "./cover-composition";
import { coverFonts, type CoverFonts } from "./cover-fonts";
import { prngFromSeed, type Prng } from "./cover-seed";

function sequencePrng(values: number[]): Prng {
    let index = 0;
    return () => values[index++ % values.length];
}

function input(overrides: Partial<CoverCompositionInput> = {}): CoverCompositionInput {
    return {
        categoryHue: 45,
        title: "Notes on FlowBus: why I built an event bus",
        excerpt: "A deep dive into designing a lightweight, type-safe event bus.",
        category: "Architecture",
        date: "2026-08-10",
        ref: "7703",
        ...overrides,
    };
}

/** Fake, non-TTF bytes — fine for `renderCoverSvg`'s own tests (only needs SOME buffer to base64-embed) but NOT for `buildCoverComposition` (which parses `interExtraBold` with `fontkit` for text measurement, and needs the real committed font). */
function fakeFonts(): CoverFonts {
    return { interBlack: Buffer.from("a"), interExtraBold: Buffer.from("b"), jetBrainsMono: Buffer.from("c") };
}

describe("buildCoverComposition", () => {
    it("always produces exactly 8 spots, each at the fixed radius fraction of width", async () => {
        const fonts = await coverFonts();
        const composition = buildCoverComposition(input(), prngFromSeed("x"), fonts);
        expect(composition.spots).toHaveLength(8);
        for (const spot of composition.spots) {
            expect(spot.r).toBeCloseTo(0.48 * COVER_WIDTH);
        }
    });

    it("keeps every spot's center within the canvas bounds", async () => {
        const fonts = await coverFonts();
        for (let i = 0; i < 20; i++) {
            const composition = buildCoverComposition(input(), prngFromSeed(`bounds-${ i }`), fonts);
            for (const spot of composition.spots) {
                expect(spot.cx).toBeGreaterThan(0);
                expect(spot.cx).toBeLessThan(COVER_WIDTH);
                expect(spot.cy).toBeGreaterThan(0);
                expect(spot.cy).toBeLessThan(COVER_HEIGHT);
            }
        }
    });

    it("pins the exact cx/cy formula at the PRNG's minimum draw (every draw returns 0)", async () => {
        // A constant-0 Prng resolves every `randomInRange(prng, 0.05, 0.95)`
        // to exactly 0.05 — precise enough to catch a `*` -> `/` mutant on
        // cx/cy (dividing by COVER_WIDTH/COVER_HEIGHT would land nowhere
        // near these values, but would still pass a loose ">0, <canvas
        // size" bounds check, which is why that check alone isn't enough).
        const fonts = await coverFonts();
        const composition = buildCoverComposition(input(), sequencePrng([0]), fonts);
        const [spot0] = composition.spots;
        expect(spot0.cx).toBeCloseTo(0.05 * COVER_WIDTH);
        expect(spot0.cy).toBeCloseTo(0.05 * COVER_HEIGHT);
    });

    it("uses the exact clipId passed to buildLetterformClip internally", async () => {
        const fonts = await coverFonts();
        const composition = buildCoverComposition(input(), prngFromSeed("x"), fonts);
        expect(composition.letterformClip.clipId).toBe("letterform-clip");
    });

    it("shapes the waveform from BOTH title and excerpt, not title alone", async () => {
        const fonts = await coverFonts();
        const a = buildCoverComposition(input({ title: "Same Title", excerpt: "Excerpt one." }), prngFromSeed("x"), fonts);
        const b = buildCoverComposition(input({ title: "Same Title", excerpt: "A completely different excerpt." }), prngFromSeed("x"), fonts);
        expect(a.waveRidges).not.toEqual(b.waveRidges);
    });

    it("derives the letterform word from the first word of the title", async () => {
        const fonts = await coverFonts();
        const composition = buildCoverComposition(input({ title: "flowbus is great" }), prngFromSeed("x"), fonts);
        expect(composition.letterformClip.word).toBe("FLOWBUS");
    });

    it("builds the exact expected stamp text from category/ref/date", async () => {
        const fonts = await coverFonts();
        const composition = buildCoverComposition(input({ category: "Architecture", ref: "7703", date: "2026-08-10" }), prngFromSeed("x"), fonts);
        expect(composition.stampText).toBe("ARCHITECTURE / 7703 / 2026-08-10");
    });

    it("produces a null titleTextLayout for a blank title", async () => {
        const fonts = await coverFonts();
        const composition = buildCoverComposition(input({ title: "   " }), prngFromSeed("x"), fonts);
        expect(composition.titleTextLayout).toBeNull();
    });

    it("produces a real titleTextLayout for a real title, wrapped against the real embedded font", async () => {
        const fonts = await coverFonts();
        const composition = buildCoverComposition(input(), prngFromSeed("x"), fonts);
        expect(composition.titleTextLayout).not.toBeNull();
        expect(composition.titleTextLayout!.lines.length).toBeGreaterThan(0);
        expect(composition.titleTextLayout!.lines.length).toBeLessThanOrEqual(3);
    });

    it("is byte-for-byte deterministic for the same seed, hue, and text", async () => {
        const fonts = await coverFonts();
        const a = buildCoverComposition(input(), prngFromSeed("flowbus"), fonts);
        const b = buildCoverComposition(input(), prngFromSeed("flowbus"), fonts);
        expect(a).toEqual(b);
    });

    it("produces a different layout for a different seed", async () => {
        const fonts = await coverFonts();
        const a = buildCoverComposition(input(), prngFromSeed("flowbus"), fonts);
        const b = buildCoverComposition(input(), prngFromSeed("testing-culture"), fonts);
        expect(a).not.toEqual(b);
    });

    it("produces a different base/spot palette for a different category hue", async () => {
        const fonts = await coverFonts();
        const a = buildCoverComposition(input({ categoryHue: 45 }), sequencePrng([0.1, 0.2, 0.3]), fonts);
        const b = buildCoverComposition(input({ categoryHue: 200 }), sequencePrng([0.1, 0.2, 0.3]), fonts);
        expect(a.base).not.toBe(b.base);
    });
});

describe("renderCoverSvg", () => {
    it("emits a well-formed, self-contained SVG document at the canonical OG size", () => {
        const composition: CoverComposition = {
            base: "#101010",
            spots: [],
            flowCurves: [],
            waveRidges: [],
            letterformClip: { clipId: "c1", word: "X", fontSize: 100, x: 600, y: 400 },
            titleTextLayout: null,
            stampText: "JOURNAL / 0000 / 2026-08-10",
        };
        const svg = renderCoverSvg(composition, fakeFonts());
        expect(svg).toMatch(/^<svg width="1200" height="630"/);
        expect(svg).toContain('viewBox="0 0 1200 630"');
        expect(svg.endsWith("</svg>")).toBe(true);
        expect(svg).not.toContain("feGaussianBlur");
        expect(svg).not.toContain("feTurbulence");
    });

    it("never throws for the fully degenerate composition (no spots, no curves, no title)", () => {
        const composition: CoverComposition = {
            base: "#101010",
            spots: [],
            flowCurves: [],
            waveRidges: [],
            letterformClip: { clipId: "c1", word: "X", fontSize: 100, x: 600, y: 400 },
            titleTextLayout: null,
            stampText: "",
        };
        expect(() => renderCoverSvg(composition, fakeFonts())).not.toThrow();
        expect(renderCoverSvg(composition, fakeFonts())).toContain("#101010");
    });

    it("includes one gradient definition and TWO circles per spot (main mesh + letterform-fill copy)", () => {
        const composition: CoverComposition = {
            base: "#101010",
            spots: [{ cx: 1, cy: 1, r: 1, color: "#ff0000" }, { cx: 2, cy: 2, r: 2, color: "#00ff00" }],
            flowCurves: [],
            waveRidges: [],
            letterformClip: { clipId: "c1", word: "X", fontSize: 100, x: 600, y: 400 },
            titleTextLayout: null,
            stampText: "",
        };
        const svg = renderCoverSvg(composition, fakeFonts());
        expect((svg.match(/<radialGradient id="spot-/g) ?? []).length).toBe(2);
        expect((svg.match(/<circle /g) ?? []).length).toBe(4); // 2 spots x 2 (main + letterform copy)
        // Joined with no separator — a `.match().length` count alone
        // wouldn't notice an inserted separator string between elements.
        expect(svg).toContain("</radialGradient><radialGradient");
        expect(svg).toContain('fill="url(#spot-0)"/><circle');
    });

    it("embeds the font-face style block", () => {
        const composition: CoverComposition = {
            base: "#101010",
            spots: [],
            flowCurves: [],
            waveRidges: [],
            letterformClip: { clipId: "c1", word: "X", fontSize: 100, x: 600, y: 400 },
            titleTextLayout: null,
            stampText: "",
        };
        const svg = renderCoverSvg(composition, fakeFonts());
        expect(svg).toContain("@font-face");
        expect(svg).toContain('font-family:"Inter"');
        expect(svg).toContain('font-family:"JetBrains Mono"');
    });

    it("renders the readable-title layer's scrim+text when a layout is present", () => {
        const composition: CoverComposition = {
            base: "#101010",
            spots: [],
            flowCurves: [],
            waveRidges: [],
            letterformClip: { clipId: "c1", word: "X", fontSize: 100, x: 600, y: 400 },
            titleTextLayout: { lines: [{ text: "Hello", y: 300 }], x: 56, color: "#ffffff", scrim: { x: 0, y: 0, width: 100, height: 50, color: "#000000" } },
            stampText: "",
        };
        const svg = renderCoverSvg(composition, fakeFonts());
        expect(svg).toContain(">Hello<");
    });

    it("renders the stamp's already-built text without re-deriving it", () => {
        const composition: CoverComposition = {
            base: "#101010",
            spots: [],
            flowCurves: [],
            waveRidges: [],
            letterformClip: { clipId: "c1", word: "X", fontSize: 100, x: 600, y: 400 },
            titleTextLayout: null,
            stampText: "CUSTOM / STAMP / TEXT",
        };
        expect(renderCoverSvg(composition, fakeFonts())).toContain("CUSTOM / STAMP / TEXT");
    });

    // Exact-string pin for a hand-built composition — kills the many
    // "delete/blank one fragment of the template-literal concatenation"
    // mutants a structural contains()/count() assertion alone can't see,
    // since a blanked fragment still leaves the OVERALL string
    // "containing" everything the other assertions above check for (the
    // same lesson v1's `renderCoverSvg` test already documented — see git
    // history for that exact comment).
    it("renders the exact expected markup for a fixed, hand-built composition", () => {
        const composition: CoverComposition = {
            base: "#101010",
            spots: [{ cx: 100, cy: 200, r: 300, color: "#ff0000" }],
            flowCurves: [],
            waveRidges: [],
            letterformClip: { clipId: "c1", word: "X", fontSize: 100, x: 600, y: 400 },
            titleTextLayout: null,
            stampText: "JOURNAL / 0000 / 2026-08-10",
        };

        expect(renderCoverSvg(composition, fakeFonts())).toBe(
            '<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">' +
            "<defs>" +
            "<style>" +
            '@font-face{font-family:"Inter";font-weight:900;src:url(data:font/ttf;base64,YQ==) format("truetype");}' +
            '@font-face{font-family:"Inter";font-weight:800;src:url(data:font/ttf;base64,Yg==) format("truetype");}' +
            '@font-face{font-family:"JetBrains Mono";font-weight:500;src:url(data:font/ttf;base64,Yw==) format("truetype");}' +
            "</style>" +
            '<radialGradient id="spot-0" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#ff0000" stop-opacity="1"/>' +
            '<stop offset="55%" stop-color="#ff0000" stop-opacity="0.55"/>' +
            '<stop offset="85%" stop-color="#ff0000" stop-opacity="0.18"/>' +
            '<stop offset="100%" stop-color="#ff0000" stop-opacity="0"/>' +
            "</radialGradient>" +
            '<clipPath id="c1"><text x="600.0" y="400.0" font-family="Inter" font-weight="900" font-size="100" text-anchor="middle">X</text></clipPath>' +
            '<radialGradient id="vignette" cx="50%" cy="50%" r="75%">' +
            '<stop offset="55%" stop-color="#000000" stop-opacity="0"/>' +
            '<stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>' +
            "</radialGradient>" +
            "</defs>" +
            '<rect width="1200" height="630" fill="#101010"/>' +
            '<g style="mix-blend-mode:overlay"><circle cx="100.00" cy="200.00" r="300.00" fill="url(#spot-0)"/></g>' +
            "<g></g><g></g>" +
            '<g clip-path="url(#c1)" opacity="0.9">' +
            '<rect width="1200" height="630" fill="#101010"/>' +
            '<g style="mix-blend-mode:overlay"><circle cx="100.00" cy="200.00" r="300.00" fill="url(#spot-0)"/></g>' +
            "</g>" +
            '<text x="600.0" y="400.0" font-family="Inter" font-weight="900" font-size="100" text-anchor="middle" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.06">X</text>' +
            '<rect width="1200" height="630" fill="url(#vignette)"/>' +
            '<text x="28" y="602" font-family="JetBrains Mono" font-weight="500" font-size="16" letter-spacing="2" fill="#f5f3f0" opacity="0.6" text-anchor="start">JOURNAL / 0000 / 2026-08-10</text>' +
            "</svg>",
        );
    });

    it("escapes XML-unsafe characters in the base colour", () => {
        const composition: CoverComposition = {
            base: '#fff"><script>',
            spots: [],
            flowCurves: [],
            waveRidges: [],
            letterformClip: { clipId: "c1", word: "X", fontSize: 100, x: 600, y: 400 },
            titleTextLayout: null,
            stampText: "",
        };
        const svg = renderCoverSvg(composition, fakeFonts());
        expect(svg).not.toContain('fill="#fff"><script>"');
        expect(svg).toContain('fill="#fff&quot;>&lt;script>"');
    });

    it("is byte-for-byte deterministic end to end for identical composition and fonts", async () => {
        const fonts = await coverFonts();
        const composition = buildCoverComposition(input(), prngFromSeed("flowbus:1:1"), fonts);
        const first = renderCoverSvg(composition, fonts);
        const second = renderCoverSvg(composition, fonts);
        expect(first).toBe(second);
    });

    it("produces a different SVG end to end for a different variant of the same slug", async () => {
        const fonts = await coverFonts();
        const compositionA = buildCoverComposition(input(), prngFromSeed("flowbus:1:1"), fonts);
        const compositionB = buildCoverComposition(input(), prngFromSeed("flowbus:1:2"), fonts);
        expect(renderCoverSvg(compositionA, fonts)).not.toBe(renderCoverSvg(compositionB, fonts));
    });
});
