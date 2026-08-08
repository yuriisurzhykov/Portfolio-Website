import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
    it("renders both the trigger and the (hidden-by-default) label bubble", () => {
        render(
            <Tooltip label="Docker">
                <a href="/work?tech=docker" aria-label="Docker">
                    logo
                </a>
            </Tooltip>,
        );

        expect(screen.getByRole("link", { name: "Docker" })).toBeInTheDocument();
        expect(screen.getByText("Docker")).toBeInTheDocument();
    });

    it("marks the bubble aria-hidden — the trigger alone carries the accessible name", () => {
        render(
            <Tooltip label="Docker">
                <a href="/work?tech=docker" aria-label="Docker">
                    logo
                </a>
            </Tooltip>,
        );

        const bubble = screen.getByText("Docker", { selector: "span" });
        expect(bubble).toHaveAttribute("aria-hidden", "true");
    });

    it("starts fully transparent (opacity-0) before any hover/focus", () => {
        render(
            <Tooltip label="Docker">
                <a href="/work?tech=docker" aria-label="Docker">
                    logo
                </a>
            </Tooltip>,
        );

        const bubble = screen.getByText("Docker", { selector: "span" });
        expect(bubble.className).toContain("opacity-0");
    });
});
