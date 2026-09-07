import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { TechIcon } from "./TechIcon";

describe("TechIcon", () => {
    it("renders nothing for kind: 'none'", () => {
        const { container } = render(<TechIcon icon={{ kind: "none" }} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders an <svg><path> with fill=currentColor for kind: 'path'", () => {
        const { container } = render(<TechIcon icon={{ kind: "path", rawSvg: "M1 2 3 4", title: "Docker" }} />);

        const svg = container.querySelector("svg");
        expect(svg).not.toBeNull();
        expect(svg).toHaveAttribute("fill", "currentColor");
        expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
        expect(svg?.querySelector("path")).toHaveAttribute("d", "M1 2 3 4");
    });

    it("renders an <img> pointed at the configured src for kind: 'url'", () => {
        const { container } = render(<TechIcon icon={{ kind: "url", src: "https://example.com/icon.svg" }} />);

        const img = container.querySelector("img");
        expect(img).toHaveAttribute("src", "https://example.com/icon.svg");
        expect(container.querySelector("svg")).toBeNull();
    });

    it("renders raw, admin-pasted SVG markup for kind: 'svg' after mount", async () => {
        const { container } = render(<TechIcon icon={{ kind: "svg", markup: '<svg><circle r="5"/></svg>' }} />);

        await waitFor(() => expect(container.querySelector("circle")).not.toBeNull());
    });

    // The actual security invariant this exists to guarantee — same
    // discipline as sanitize-svg.test.ts's own test, but proven here
    // through the REAL component boundary (dangerouslySetInnerHTML), not
    // just the sanitizer function in isolation: a <script> tag embedded in
    // admin-pasted SVG markup must never become a live DOM node.
    it("never lets a <script> tag embedded in kind: 'svg' markup become a live DOM node", async () => {
        const malicious = '<svg><script>window.__pwned = true;</script><circle r="5"/></svg>';
        const { container } = render(<TechIcon icon={{ kind: "svg", markup: malicious }} />);

        await waitFor(() => expect(container.querySelector("circle")).not.toBeNull());
        expect(container.querySelector("script")).toBeNull();
    });
});
