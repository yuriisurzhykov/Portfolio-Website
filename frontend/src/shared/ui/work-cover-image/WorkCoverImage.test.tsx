import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkCoverImage } from "./WorkCoverImage";

const GENERATED_COVER = {
    src: "/media/covers/abc-1200.webp",
    srcNarrow: "/media/covers/abc-640.webp",
    placeholder: "data:image/webp;base64,AAA",
    width: 1200,
    height: 630,
};

describe("WorkCoverImage", () => {
    it("renders the manual override when set, even if a generated cover also exists", () => {
        render(<WorkCoverImage override="/images/manual.jpg" cover={GENERATED_COVER} alt="FlowBus" label="flowbus" />);

        const img = screen.getByRole("img");
        expect(img).toHaveAttribute("src", "/images/manual.jpg");
        expect(img).toHaveAttribute("alt", "FlowBus");
    });

    it("renders the generated cover when there is no manual override", () => {
        const { container } = render(<WorkCoverImage override={null} cover={GENERATED_COVER} alt="FlowBus" label="flowbus" />);

        const img = container.querySelector("img");
        expect(img).toHaveAttribute("src", "/media/covers/abc-1200.webp");
        // The generated cover is always decorative — `alt`/`label` here are
        // simply not applicable, same convention as a Post's own cover.
        expect(img).toHaveAttribute("alt", "");
    });

    it("falls back to the plain decorative placeholder when neither exists", () => {
        render(<WorkCoverImage override={null} cover={null} alt="FlowBus" label="flowbus — cover image" />);

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByText("flowbus — cover image")).toBeInTheDocument();
    });
});
