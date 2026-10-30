import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SingleValueCombobox } from "./SingleValueCombobox";

function Example({ creatable = false }: { creatable?: boolean }) {
    const [value, setValue] = React.useState<string | null>(null);
    return (
        <>
            <SingleValueCombobox
                id="category"
                label="Category"
                value={value}
                onChange={setValue}
                options={[
                    { value: "architecture", label: "Architecture" },
                    { value: "android", label: "Android" },
                ]}
                creatable={creatable}
            />
            <output aria-label="Selected">{value ?? "None"}</output>
        </>
    );
}

describe("SingleValueCombobox", () => {
    it("selects one existing option by keyboard and allows clearing", () => {
        render(<Example />);
        const input = screen.getByRole("combobox", { name: "Category" });
        fireEvent.focus(input);
        fireEvent.keyDown(input, { key: "ArrowDown" });
        fireEvent.keyDown(input, { key: "Enter" });
        expect(screen.getByLabelText("Selected")).toHaveTextContent("architecture");
        fireEvent.click(screen.getByRole("button", { name: "Clear Category" }));
        expect(screen.getByLabelText("Selected")).toHaveTextContent("None");
    });
    it("never commits arbitrary relationship text on Enter or blur", () => {
        render(<Example />);
        const input = screen.getByRole("combobox");
        fireEvent.change(input, { target: { value: "unknown" } });
        fireEvent.keyDown(input, { key: "Enter" });
        fireEvent.blur(input);
        expect(screen.getByLabelText("Selected")).toHaveTextContent("None");
        expect(input).toHaveValue("");
    });
    it("creates a category only by explicit selection and closes with Escape", () => {
        render(<Example creatable />);
        const input = screen.getByRole("combobox");
        fireEvent.change(input, { target: { value: "New category" } });
        fireEvent.mouseDown(screen.getByRole("option", { name: 'Create "New category"' }));
        expect(screen.getByLabelText("Selected")).toHaveTextContent("New category");
        fireEvent.focus(input);
        fireEvent.keyDown(input, { key: "Escape" });
        expect(input).toHaveAttribute("aria-expanded", "false");
    });
});
