import Prism from "prismjs";
import { describe, expect, it } from "vitest";
import { highlightCode } from "./codeHighlighter";

describe("codeHighlighter module side effect", () => {
    // Plain top-level import on purpose — a dynamic `import()` here breaks
    // Stryker's coverage attribution for the other tests below. See
    // frontend/README.md's dated entry for the full story.
    it("sets Prism.manual = true on import — a real, live hydration bug otherwise", () => {
        expect(Prism.manual).toBe(true);
    });
});

describe("highlightCode", () => {
    it("wraps recognized tokens in Prism's span markup for a supported language", () => {
        const html = highlightCode("const x = 1;", "ts");
        expect(html).toContain('<span class="token keyword">const</span>');
    });

    it("returns the code completely unchanged when the language has no matching Prism grammar", () => {
        const raw = "SELECT * FROM users;";
        expect(highlightCode(raw, "sql" as never)).toBe(raw);
    });
});
