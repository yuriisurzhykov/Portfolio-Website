import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RelatedItemPicker } from "./RelatedItemPicker";
import type { RelatedItemOption } from "./RelatedItemPicker.types";

const OPTIONS: RelatedItemOption[] = [
    { slug: "flowbus", label: "FlowBus" },
    { slug: "design-system", label: "Dynamic Design System" },
    { slug: "hsm-library", label: "HSM Library" },
];

describe("RelatedItemPicker", () => {
    it("shows the currently selected option's label, not its slug", () => {
        render(<RelatedItemPicker id="related" label="Related project" value="flowbus" onChange={vi.fn()} options={OPTIONS} />);

        expect(screen.getByRole("combobox")).toHaveValue("FlowBus");
    });

    it("shows an empty input when value is null", () => {
        render(<RelatedItemPicker id="related" label="Related project" value={null} onChange={vi.fn()} options={OPTIONS} />);

        expect(screen.getByRole("combobox")).toHaveValue("");
    });

    it("typing filters the dropdown via fuzzy match on the label", async () => {
        const user = userEvent.setup();
        render(<RelatedItemPicker id="related" label="Related project" value={null} onChange={vi.fn()} options={OPTIONS} />);

        await user.type(screen.getByRole("combobox"), "dds");

        expect(await screen.findByRole("option", { name: "Dynamic Design System" })).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "FlowBus" })).not.toBeInTheDocument();
    });

    it("clicking an option commits its SLUG, not its label, and displays the label", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<RelatedItemPicker id="related" label="Related project" value={null} onChange={onChange} options={OPTIONS} />);

        await user.type(screen.getByRole("combobox"), "flow");
        await user.click(await screen.findByRole("option", { name: "FlowBus" }));

        expect(onChange).toHaveBeenCalledWith("flowbus");
        expect(screen.getByRole("combobox")).toHaveValue("FlowBus");
    });

    it("pressing Enter with an option highlighted commits that option, not the raw typed text", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<RelatedItemPicker id="related" label="Related project" value={null} onChange={onChange} options={OPTIONS} />);

        await user.type(screen.getByRole("combobox"), "hsm");
        await user.keyboard("{ArrowDown}{Enter}");

        expect(onChange).toHaveBeenCalledWith("hsm-library");
    });

    it("pressing Enter with NOTHING highlighted never commits raw typed text — the whole point of this widget over a free-text Input", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<RelatedItemPicker id="related" label="Related project" value={null} onChange={onChange} options={OPTIONS} />);

        await user.type(screen.getByRole("combobox"), "some typo'd slug that does not exist{Enter}");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("blurring without picking an option reverts the input back to the current selection, discarding the typed text", async () => {
        const user = userEvent.setup();
        render(<RelatedItemPicker id="related" label="Related project" value="flowbus" onChange={vi.fn()} options={OPTIONS} />);

        const input = screen.getByRole("combobox");
        await user.clear(input);
        await user.type(input, "garbage");
        await user.tab();

        expect(input).toHaveValue("FlowBus");
    });

    it("a clear button appears only when something is selected, and clicking it commits null", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const { rerender } = render(<RelatedItemPicker id="related" label="Related project" value={null} onChange={onChange} options={OPTIONS} />);
        expect(screen.queryByRole("button", { name: "Clear Related project" })).not.toBeInTheDocument();

        rerender(<RelatedItemPicker id="related" label="Related project" value="flowbus" onChange={onChange} options={OPTIONS} />);
        await user.click(screen.getByRole("button", { name: "Clear Related project" }));

        expect(onChange).toHaveBeenCalledWith(null);
    });
});
