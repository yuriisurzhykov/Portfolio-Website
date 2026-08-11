import { describe, expect, it } from "vitest";
import { buildCoverComposition, renderCoverSvg } from "./cover-composition";
import { prngFromSeed } from "./cover-seed";
import { fullVariantKey, narrowVariantKey, rasterizeCover } from "./image-processing";

function sampleSvg(): Buffer {
    const svg = renderCoverSvg(buildCoverComposition(180, prngFromSeed("image-processing-test")));
    return Buffer.from(svg, "utf-8");
}

describe("rasterizeCover", () => {
    it("produces a full variant at the canonical 1200x630 size", async () => {
        const processed = await rasterizeCover(sampleSvg(), "image/svg+xml");

        expect(processed.mimeType).toBe("image/webp");
        expect(processed.width).toBe(1200);
        expect(processed.height).toBe(630);
        expect(processed.full.width).toBe(1200);
        expect(processed.full.height).toBe(630);
        expect(processed.full.byteSize).toBe(processed.full.bytes.length);
    });

    it("produces a narrow variant at 640 wide, same aspect ratio", async () => {
        const processed = await rasterizeCover(sampleSvg(), "image/svg+xml");

        expect(processed.narrow.width).toBe(640);
        expect(processed.narrow.height).toBe(Math.round(630 * (640 / 1200)));
    });

    it("returns a valid, small inline WebP placeholder", async () => {
        const processed = await rasterizeCover(sampleSvg(), "image/svg+xml");

        expect(processed.placeholder.startsWith("data:image/webp;base64,")).toBe(true);
        // "Small" is the whole point of a blur-up placeholder — the base64
        // payload for a 24px-wide WebP should be well under 1KB.
        expect(processed.placeholder.length).toBeLessThan(2000);
    });

    it("is deterministic: identical input bytes yield the identical contentHash", async () => {
        const bytes = sampleSvg();
        const first = await rasterizeCover(bytes, "image/svg+xml");
        const second = await rasterizeCover(bytes, "image/svg+xml");

        expect(second.contentHash).toBe(first.contentHash);
        expect(second.full.bytes.equals(first.full.bytes)).toBe(true);
    });

    it("produces a different contentHash for different source bytes", async () => {
        const a = await rasterizeCover(sampleSvg(), "image/svg+xml");
        const b = await rasterizeCover(
            Buffer.from(renderCoverSvg(buildCoverComposition(45, prngFromSeed("different"))), "utf-8"),
            "image/svg+xml",
        );
        expect(a.contentHash).not.toBe(b.contentHash);
    });
});

describe("variant key helpers", () => {
    it("append the matching width and a .webp extension to a shared prefix", () => {
        expect(fullVariantKey("covers/abc")).toBe("covers/abc-1200.webp");
        expect(narrowVariantKey("covers/abc")).toBe("covers/abc-640.webp");
    });
});
