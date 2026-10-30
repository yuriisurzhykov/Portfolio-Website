import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { WorkProperties } from "./WorkProperties";
import type { WorkPropertiesValue } from "../model/types";

beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
        this.removeAttribute("open");
    };
});
it("preserves case-study metadata across tabs and cancelled removal", () => {
    function Example() {
        const [value, set] = React.useState<WorkPropertiesValue>({
            title: "Camera",
            summary: "Summary",
            date: "2026-10-29",
            stack: ["Kotlin"],
            coverImage: "",
            relatedPostSlug: "",
            hasCaseStudy: true,
            startedLabel: "Sep 2026",
            shippedLabel: "Q4 2026",
            role: "Lead engineer",
            heroImage: "",
        });
        return (
            <WorkProperties
                value={value}
                status="in-progress"
                onChange={(key, item) => set((previous) => ({ ...previous, [key]: item }))}
                techStackSuggestions={[]}
                postOptions={[]}
            />
        );
    }
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "Case study" }));
    expect(screen.getByRole("textbox", { name: "Target" })).toHaveValue("Q4 2026");
    fireEvent.click(screen.getByRole("button", { name: "Remove case study…" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep case study" }));
    fireEvent.click(screen.getByRole("button", { name: "Card" }));
    fireEvent.click(screen.getByRole("button", { name: "Case study" }));
    expect(screen.getByRole("textbox", { name: "Your role" })).toHaveValue("Lead engineer");
});
