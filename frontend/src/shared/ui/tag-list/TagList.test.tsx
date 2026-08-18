import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TagList } from "./TagList";

describe("TagList", () => {
    it("renders every item with no maxVisible — the detail-page full-list state", () => {
        render(<TagList items={["Kotlin", "React", "Rust"]} />);

        expect(screen.getByText("Kotlin")).toBeInTheDocument();
        expect(screen.getByText("React")).toBeInTheDocument();
        expect(screen.getByText("Rust")).toBeInTheDocument();
        expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it("truncates to maxVisible and shows a +N indicator for the rest", () => {
        render(<TagList items={["Kotlin", "React", "Rust", "Go"]} maxVisible={2} />);

        expect(screen.getByText("Kotlin")).toBeInTheDocument();
        expect(screen.getByText("React")).toBeInTheDocument();
        expect(screen.queryByText("Rust")).not.toBeInTheDocument();
        expect(screen.queryByText("Go")).not.toBeInTheDocument();
        expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("shows no +N indicator when every item already fits within maxVisible", () => {
        render(<TagList items={["Kotlin", "React"]} maxVisible={5} />);

        expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it("names the hidden items in the +N indicator's title, for a hover hint", () => {
        render(<TagList items={["Kotlin", "React", "Rust"]} maxVisible={1} />);

        expect(screen.getByText("+2")).toHaveAttribute("title", "React, Rust");
    });

    it("boundary: exactly maxVisible items shows zero hidden, not an off-by-one +0", () => {
        render(<TagList items={["Kotlin", "React"]} maxVisible={2} />);

        expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });
});
