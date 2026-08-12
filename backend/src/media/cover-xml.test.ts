import { describe, expect, it } from "vitest";
import { escapeXmlAttribute, escapeXmlText } from "./cover-xml";

describe("escapeXmlAttribute", () => {
    it("escapes the double-quote that would otherwise break out of an attribute", () => {
        expect(escapeXmlAttribute('#fff"><script>')).toBe("#fff&quot;>&lt;script>");
    });

    it("escapes ampersand and less-than", () => {
        expect(escapeXmlAttribute("&<\"")).toBe("&amp;&lt;&quot;");
    });

    it("leaves a plain string with none of the special characters unchanged", () => {
        expect(escapeXmlAttribute("#101010")).toBe("#101010");
    });

    it("does NOT escape a bare greater-than (no attribute-breakout risk from it alone)", () => {
        expect(escapeXmlAttribute("a>b")).toBe("a>b");
    });
});

describe("escapeXmlText", () => {
    it("escapes ampersand and less-than", () => {
        expect(escapeXmlText("Q&A <tag>")).toBe("Q&amp;A &lt;tag>");
    });

    it("does NOT escape a double-quote (no attribute context to break out of)", () => {
        expect(escapeXmlText('say "hi"')).toBe('say "hi"');
    });

    it("leaves a plain string unchanged", () => {
        expect(escapeXmlText("FLOWBUS")).toBe("FLOWBUS");
    });
});
