import { afterEach, describe, expect, it } from "vitest";
import type { CoverBrief } from "./cover-brief";
import {
    FailingImageGenerator,
    getImageGenerator,
    isImageGenerationError,
    ProceduralImageGenerator,
    setImageGeneratorForTesting,
} from "./image-generator";

const BRIEF: CoverBrief = {
    seed: "flowbus",
    title: "FlowBus",
    sourceText: "Why I built it.",
    category: "Architecture",
    hue: 45,
    locale: "en",
    styleVersion: 1,
    variant: 1,
};

describe("ProceduralImageGenerator", () => {
    it("resolves with SVG bytes at the canonical cover size", async () => {
        const image = await new ProceduralImageGenerator().generate(BRIEF);

        expect(image.mimeType).toBe("image/svg+xml");
        expect(image.width).toBe(1200);
        expect(image.height).toBe(630);
        expect(image.generatorId).toBe("procedural");
        expect(image.source).toContain("<svg");
        expect(image.bytes.toString("utf-8")).toBe(image.source);
    });

    it("is deterministic for the same brief", async () => {
        const generator = new ProceduralImageGenerator();
        const a = await generator.generate(BRIEF);
        const b = await generator.generate(BRIEF);
        expect(a.bytes.equals(b.bytes)).toBe(true);
    });

    it("produces different bytes for a different variant of the same seed", async () => {
        const generator = new ProceduralImageGenerator();
        const a = await generator.generate(BRIEF);
        const b = await generator.generate({ ...BRIEF, variant: 2 });
        expect(a.bytes.equals(b.bytes)).toBe(false);
    });

    it("never rejects", async () => {
        await expect(new ProceduralImageGenerator().generate(BRIEF)).resolves.toBeDefined();
    });
});

describe("FailingImageGenerator", () => {
    it("always rejects with an ImageGenerationError", async () => {
        await expect(new FailingImageGenerator().generate(BRIEF)).rejects.toThrow();
        try {
            await new FailingImageGenerator("custom reason").generate(BRIEF);
            expect.unreachable();
        } catch (error) {
            expect(isImageGenerationError(error)).toBe(true);
            expect((error as Error).message).toBe("custom reason");
        }
    });
});

describe("getImageGenerator", () => {
    afterEach(() => {
        setImageGeneratorForTesting(undefined);
        delete process.env.IMAGE_GENERATOR;
    });

    it("defaults to ProceduralImageGenerator", () => {
        expect(getImageGenerator()).toBeInstanceOf(ProceduralImageGenerator);
    });

    it("returns FailingImageGenerator when IMAGE_GENERATOR=failing", () => {
        process.env.IMAGE_GENERATOR = "failing";
        expect(getImageGenerator()).toBeInstanceOf(FailingImageGenerator);
    });

    it("caches the instance across calls", () => {
        expect(getImageGenerator()).toBe(getImageGenerator());
    });
});
