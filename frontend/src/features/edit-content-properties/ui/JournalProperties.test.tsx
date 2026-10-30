import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { JournalProperties } from "./JournalProperties";
import type { JournalPropertiesValue } from "../model/types";

it("keeps one category, excerpt and related work as independent fields", () => {
    function Example() {
        const [value, set] = React.useState<JournalPropertiesValue>({
            title: "Title",
            category: "Architecture",
            excerpt: "Teaser",
            relatedWorkSlug: "flow",
        });
        return (
            <JournalProperties
                value={value}
                onChange={(key, item) => set((previous) => ({ ...previous, [key]: item }))}
                existingCategories={["Architecture", "Android"]}
                workOptions={[{ slug: "flow", label: "Flow Engine" }]}
            />
        );
    }
    render(<Example />);
    fireEvent.focus(screen.getByRole("combobox", { name: "Category" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), { target: { value: "Android" } });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Category" }), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Category" }), { key: "Enter" });
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("Android");
    expect(screen.getByRole("textbox", { name: "Excerpt" })).toHaveValue("Teaser");
    fireEvent.click(screen.getByRole("button", { name: "Clear Related work" }));
    expect(screen.getByRole("combobox", { name: "Related work" })).toHaveValue("");
});
