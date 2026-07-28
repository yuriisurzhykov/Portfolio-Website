import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
    it("renders bold text", () => {
        const { container } = render(<Markdown text="this is **bold** text" />);
        expect(container.querySelector("strong")?.textContent).toBe("bold");
    });

    it("renders italic text", () => {
        const { container } = render(<Markdown text="this is *italic* text" />);
        expect(container.querySelector("em")?.textContent).toBe("italic");
    });

    it("renders links", () => {
        const { container } = render(<Markdown text="see [this link](https://example.com)" />);
        const link = container.querySelector("a");
        expect(link?.getAttribute("href")).toBe("https://example.com");
    });

    it("does not wrap single-paragraph text in its own <p> (unwrapped, per the component's contract)", () => {
        const { container } = render(<Markdown text="plain text" />);
        expect(container.querySelector("p")).toBeNull();
    });

    /**
     * The actual security property this component exists to guarantee: raw
     * HTML embedded in admin-authored text must never become live DOM. If
     * this ever regresses (e.g. someone adds the `rehype-raw` plugin to
     * "support richer formatting"), a `<script>` tag written into a post's
     * text would execute in every visitor's browser — this test is what
     * would catch that before it ships.
     */
    it("never renders embedded raw HTML as actual markup — a <script> tag stays visible, inert text", () => {
        const { container } = render(<Markdown text={"before <script>alert(1)</script> after"} />);

        expect(container.querySelector("script")).toBeNull();
        expect(container.textContent).toContain("<script>alert(1)</script>");
    });

    it("does not render a raw <img onerror=...> as a live element either", () => {
        const { container } = render(<Markdown text={'<img src=x onerror="alert(1)">'} />);

        const img = container.querySelector("img");
        expect(img).toBeNull();
    });
});
