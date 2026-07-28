import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
    it("lowercases and hyphenates a normal title", () => {
        expect(slugify("Why I Built FlowBus")).toBe("why-i-built-flowbus");
    });

    it("collapses punctuation and repeated separators into single hyphens", () => {
        expect(slugify("An Architecture I Chose Not to Ship!")).toBe("an-architecture-i-chose-not-to-ship");
        expect(slugify("A -- B")).toBe("a-b");
    });

    it("strips leading/trailing hyphens", () => {
        expect(slugify("  -Leading and trailing- ")).toBe("leading-and-trailing");
    });

    it("strips accents rather than dropping the letter entirely", () => {
        expect(slugify("Café Résumé")).toBe("cafe-resume");
    });

    it("produces an empty string for a title with nothing sluggable, instead of throwing", () => {
        expect(slugify("!!!")).toBe("");
        expect(slugify("")).toBe("");
    });

    it("always matches backend's slugSchema shape", () => {
        const result = slugify("Notes from the ONVIF Camera Library — draft (2026)");
        expect(result).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    });
});
