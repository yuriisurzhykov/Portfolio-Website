import { describe, expect, it } from "vitest";
import { sanitizeDiagramSvg } from "./sanitize-svg";

describe("sanitizeDiagramSvg", () => {
    /**
     * The actual security property this function exists to guarantee: a
     * <script> tag embedded in rendered SVG (whether from a compromised
     * Mermaid/PlantUML output or a future rendering-engine regression) must
     * never survive into the string that gets passed to
     * dangerouslySetInnerHTML. Mirrors Markdown.test.tsx's own "the real
     * invariant, not just a happy path" test.
     */
    it("strips an embedded <script> tag entirely", () => {
        const malicious = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>';
        const clean = sanitizeDiagramSvg(malicious);

        expect(clean).not.toContain("<script");
        expect(clean).not.toContain("alert(1)");
        expect(clean).toContain("<circle");
    });

    it("strips an inline event-handler attribute (onload) from an SVG element", () => {
        const malicious = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>';
        const clean = sanitizeDiagramSvg(malicious);

        expect(clean).not.toContain("onload");
        expect(clean).not.toContain("alert(1)");
        expect(clean).toContain("<rect");
    });

    it("keeps legitimate SVG structure Mermaid/PlantUML actually emit (paths, groups, text, gradients)", () => {
        const legit = '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs><g><path d="M0 0 L10 10" stroke="black"/><text x="5" y="5">label</text></g></svg>';
        const clean = sanitizeDiagramSvg(legit);

        expect(clean).toContain("<path");
        expect(clean).toContain("<text");
        expect(clean).toContain("linearGradient");
        expect(clean).toContain("label");
    });
});
