import { expect, it } from "vitest";
import { hasMeaningfulBlocks } from "./has-meaningful-blocks";

it("ignores blank editor paragraphs and code metadata, but keeps authored text and images", () => {
    expect(hasMeaningfulBlocks([{ type: "paragraph", text: "  " }])).toBe(false);
    expect(hasMeaningfulBlocks([{ type: "code", data: { filename: "snippet.kt", language: "kotlin", code: "" } }])).toBe(false);
    expect(hasMeaningfulBlocks([{ type: "paragraph", text: "Idea" }])).toBe(true);
    expect(hasMeaningfulBlocks([{ type: "image", data: { src: "/image.png", alt: "" } }])).toBe(true);
});
