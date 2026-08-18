import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DiagramSurface } from "./DiagramSurface";

describe("DiagramSurface", () => {
    /**
     * The real invariant: even if a rendering engine (Mermaid client-side,
     * or the PlantUML proxy's upstream response) ever produced a malicious
     * SVG, it must not become a live <script> in the thumbnail — the one
     * `dangerouslySetInnerHTML` call this component always renders,
     * regardless of whether the lightbox is ever opened. See sanitize-svg.ts.
     */
    it("never renders an embedded <script> tag from the svg prop as live markup", () => {
        const malicious = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>';
        const { container } = render(<DiagramSurface svg={malicious} />);

        expect(container.querySelector("script")).toBeNull();
        expect(container.querySelector("circle")).not.toBeNull();
    });

    it("strips an inline event-handler attribute from the svg prop", () => {
        const malicious = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>';
        const { container } = render(<DiagramSurface svg={malicious} />);

        const svgEl = container.querySelector("svg");
        expect(svgEl?.getAttribute("onload")).toBeNull();
        expect(container.querySelector("rect")).not.toBeNull();
    });

    /**
     * 2026-08-10 — the actual bug report this pipeline was missing coverage
     * for: real Mermaid output wraps node/edge labels in
     * `<foreignObject><div><span class="nodeLabel">TEXT</span></div>
     * </foreignObject>` (see sanitize-svg.ts's dated comment), and this is
     * the ONE component every diagram (MermaidDiagram, PlantUmlDiagram)
     * renders its SVG through — so this is where a regression here would
     * actually be visible to a user, not just to sanitizeSvg's own unit
     * tests in isolation.
     */
    it("renders a Mermaid-style foreignObject label's text in the DOM, not just an empty foreignObject", () => {
        const mermaidLikeSvg =
            '<svg xmlns="http://www.w3.org/2000/svg"><g class="node">' +
            '<rect width="100" height="20"/>' +
            '<foreignObject width="100" height="20">' +
            '<div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell;">' +
            '<span class="nodeLabel">Decision</span></div>' +
            "</foreignObject></g></svg>";
        const { container } = render(<DiagramSurface svg={mermaidLikeSvg} />);

        expect(container.querySelector("foreignObject")).not.toBeNull();
        expect(container.querySelector("span.nodeLabel")).not.toBeNull();
        expect(container.textContent).toContain("Decision");
    });
});
