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
});
