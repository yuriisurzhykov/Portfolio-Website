import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelatedContentCallout } from "./RelatedContentCallout";
import { CompactRelatedLink } from "./CompactRelatedLink";

describe("RelatedContentCallout", () => {
    it("renders the eyebrow, title, body, and a link to href with the button label", () => {
        render(
            <RelatedContentCallout
                eyebrow="Related project"
                title="FlowBus"
                body="A real-time transit tracker."
                href="/work/flowbus"
                buttonLabel="View case study"
            />,
        );

        expect(screen.getByText("Related project")).toBeInTheDocument();
        expect(screen.getByText("FlowBus")).toBeInTheDocument();
        expect(screen.getByText("A real-time transit tracker.")).toBeInTheDocument();
        const link = screen.getByRole("link", { name: /View case study/ });
        expect(link).toHaveAttribute("href", "/work/flowbus");
    });
});

describe("CompactRelatedLink", () => {
    it("renders a link with the exact href and a visible label — not a silent, unlabeled link", () => {
        render(<CompactRelatedLink href="/journal/my-post" label="Related post" />);

        const link = screen.getByRole("link", { name: /Related post/ });
        expect(link).toHaveAttribute("href", "/journal/my-post");
        expect(link).toHaveTextContent("Related post");
    });
});
