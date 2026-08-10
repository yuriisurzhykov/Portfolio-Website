import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitize-svg";

describe("sanitizeSvg", () => {
    /**
     * The actual security property this function exists to guarantee: a
     * <script> tag embedded in SVG markup (whether from a compromised
     * Mermaid/PlantUML rendering-engine output, or a raw `<svg>` an admin
     * pasted directly for a tech-stack logo) must never survive into the
     * string that gets passed to dangerouslySetInnerHTML. Mirrors
     * Markdown.test.tsx's own "the real invariant, not just a happy path"
     * test.
     */
    it("strips an embedded <script> tag entirely", () => {
        const malicious = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>';
        const clean = sanitizeSvg(malicious);

        expect(clean).not.toContain("<script");
        expect(clean).not.toContain("alert(1)");
        expect(clean).toContain("<circle");
    });

    it("strips an inline event-handler attribute (onload) from an SVG element", () => {
        const malicious = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>';
        const clean = sanitizeSvg(malicious);

        expect(clean).not.toContain("onload");
        expect(clean).not.toContain("alert(1)");
        expect(clean).toContain("<rect");
    });

    it("keeps legitimate SVG structure (paths, groups, text, gradients)", () => {
        const legit = '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs><g><path d="M0 0 L10 10" stroke="black"/><text x="5" y="5">label</text></g></svg>';
        const clean = sanitizeSvg(legit);

        expect(clean).toContain("<path");
        expect(clean).toContain("<text");
        expect(clean).toContain("linearGradient");
        expect(clean).toContain("label");
    });

    it("keeps an SVG filter primitive (feDropShadow) — specifically requires the svgFilters profile, not just the base svg one", () => {
        // Verified by hand (not assumed): `feDropShadow` is one of the few
        // real elements where `USE_PROFILES: { svg: true, svgFilters: false }`
        // (or omitting `svgFilters` from the profile entirely) measurably
        // strips it, while `svgFilters: true` keeps it — most other SVG
        // filter primitives (feColorMatrix, feComposite, ...) turned out to
        // round-trip identically either way in this DOMPurify version, so
        // this specific element is the one real distinguishing case found.
        const legit = '<svg xmlns="http://www.w3.org/2000/svg"><filter id="f"><feDropShadow dx="2" dy="2"/></filter><rect width="10" height="10" filter="url(#f)"/></svg>';
        const clean = sanitizeSvg(legit);

        expect(clean.toLowerCase()).toContain("<fedropshadow");
    });

    it("strips a <foreignObject> smuggling an <iframe> — a common SVG-specific XSS vector the svg/svgFilters profile alone wouldn't necessarily flag as HTML", () => {
        const malicious = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>';
        const clean = sanitizeSvg(malicious);

        expect(clean).not.toContain("<iframe");
        expect(clean).not.toContain("javascript:");
    });

    /**
     * The regression this file was missing before 2026-08-10's live bug
     * report ("no Mermaid diagram shows its label text"). The test above
     * only proves an ATTACK payload's `<iframe>` doesn't survive inside a
     * `<foreignObject>` — it says nothing about whether LEGITIMATE content
     * one level deeper (an actual Mermaid label: a plain `<div>`/`<span>`
     * with text and a class, no script/event-handler anywhere in sight)
     * survives at all. It didn't, in this installed DOMPurify version,
     * until `sanitizeSvg` opted back in to `foreignObject` as an HTML
     * entry point (see the dated comment in sanitize-svg.ts). Markup shape
     * copied from real `mermaid.render()` output, not invented by hand.
     */
    it("keeps a legitimate Mermaid-style label's text and markup inside a <foreignObject>", () => {
        const mermaidLikeLabel =
            '<svg xmlns="http://www.w3.org/2000/svg"><g class="node"><rect width="100" height="20"/>' +
            '<foreignObject width="100" height="20">' +
            '<div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell;" class="nodeLabel">' +
            '<span class="nodeLabel">Decision</span></div>' +
            "</foreignObject></g></svg>";
        const clean = sanitizeSvg(mermaidLikeLabel);

        expect(clean).toContain("<foreignObject");
        expect(clean).toContain("Decision");
        expect(clean).toContain('class="nodeLabel"');
        expect(clean).toContain("<rect");
    });
});
