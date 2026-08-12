import { afterEach, describe, expect, it } from "vitest";
import { coverFonts, setCoverFontsForTesting } from "./cover-fonts";

describe("coverFonts", () => {
    afterEach(() => {
        setCoverFontsForTesting(undefined);
    });

    it("actually reads the three real, committed font files off disk", async () => {
        const fonts = await coverFonts();
        // A real TTF file starts with one of a small set of magic numbers —
        // this is a live check that the bytes are a real font, not e.g. an
        // accidentally-empty or HTML error-page file (a real failure mode
        // for a script that fetches from a network endpoint).
        for (const buffer of [fonts.interBlack, fonts.interExtraBold, fonts.jetBrainsMono]) {
            expect(buffer.length).toBeGreaterThan(1000);
            const magic = buffer.readUInt32BE(0);
            expect([0x00010000, 0x4f54544f, 0x74727565]).toContain(magic);
        }
    });

    it("caches the result — a second call returns the exact same object, not a fresh read", async () => {
        const first = await coverFonts();
        const second = await coverFonts();
        expect(second).toBe(first);
    });

    it("setCoverFontsForTesting lets a test inject fake fonts instead of reading real files", async () => {
        const fake = { interBlack: Buffer.from("a"), interExtraBold: Buffer.from("b"), jetBrainsMono: Buffer.from("c") };
        setCoverFontsForTesting(Promise.resolve(fake));
        expect(await coverFonts()).toBe(fake);
    });
});
