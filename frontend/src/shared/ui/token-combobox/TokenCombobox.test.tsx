import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TokenCombobox } from "./TokenCombobox";

const SUGGESTIONS = ["Kotlin", "Jetpack Compose", "Python & Jinja2"];

/** Every chip always renders a "Remove {value}" button, so its presence is a reliable proxy for "this value is rendered as a chip" — more robust than text-matching the chip's `<span>` (its text content also includes the "×" remove glyph, which trips up exact-text queries). */
function chipRemoveButton(value: string) {
    return screen.queryByRole("button", { name: `Remove ${value}` });
}

describe("TokenCombobox", () => {
    it("renders every current value as a chip", () => {
        render(<TokenCombobox id="stack" label="Stack" values={["Kotlin", "React"]} onChange={vi.fn()} suggestions={SUGGESTIONS} />);

        expect(chipRemoveButton("Kotlin")).toBeInTheDocument();
        expect(chipRemoveButton("React")).toBeInTheDocument();
    });

    it("typing free text and pressing Enter adds it as a new value", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TokenCombobox id="stack" label="Stack" values={[]} onChange={onChange} suggestions={SUGGESTIONS} />);

        await user.type(screen.getByRole("combobox"), "Rust{Enter}");

        expect(onChange).toHaveBeenCalledWith(["Rust"]);
    });

    it("does not add an empty/whitespace-only value on Enter", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TokenCombobox id="stack" label="Stack" values={[]} onChange={onChange} suggestions={SUGGESTIONS} />);

        await user.type(screen.getByRole("combobox"), "   {Enter}");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("does not add a value that's already present (case-insensitive)", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TokenCombobox id="stack" label="Stack" values={["Kotlin"]} onChange={onChange} suggestions={SUGGESTIONS} />);

        await user.type(screen.getByRole("combobox"), "kotlin{Enter}");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("clicking a chip's remove button removes exactly that value", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TokenCombobox id="stack" label="Stack" values={["Kotlin", "React"]} onChange={onChange} suggestions={SUGGESTIONS} />);

        await user.click(chipRemoveButton("Kotlin")!);

        expect(onChange).toHaveBeenCalledWith(["React"]);
    });

    it("pressing Backspace on an empty input removes the last chip", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TokenCombobox id="stack" label="Stack" values={["Kotlin", "React"]} onChange={onChange} suggestions={SUGGESTIONS} />);

        await user.type(screen.getByRole("combobox"), "{Backspace}");

        expect(onChange).toHaveBeenCalledWith(["Kotlin"]);
    });

    it("Backspace does nothing when the input already has text", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TokenCombobox id="stack" label="Stack" values={["Kotlin"]} onChange={onChange} suggestions={SUGGESTIONS} />);

        await user.type(screen.getByRole("combobox"), "a{Backspace}");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("shows a fuzzy-matched suggestion dropdown while typing, and clicking an option commits it", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TokenCombobox id="stack" label="Stack" values={[]} onChange={onChange} suggestions={SUGGESTIONS} />);

        await user.type(screen.getByRole("combobox"), "jc");
        const option = await screen.findByRole("option", { name: "Jetpack Compose" });
        await user.click(option);

        expect(onChange).toHaveBeenCalledWith(["Jetpack Compose"]);
    });

    it("pressing Enter with a suggestion highlighted commits the highlighted suggestion, not the raw text", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TokenCombobox id="stack" label="Stack" values={[]} onChange={onChange} suggestions={SUGGESTIONS} />);

        const input = screen.getByRole("combobox");
        await user.type(input, "jc");
        await user.keyboard("{ArrowDown}{Enter}");

        expect(onChange).toHaveBeenCalledWith(["Jetpack Compose"]);
    });

    it("gives a chip a 'did you mean' hint when it's close to (but not exactly) a known suggestion", () => {
        render(<TokenCombobox id="stack" label="Stack" values={["Python"]} onChange={vi.fn()} suggestions={SUGGESTIONS} />);

        const chip = chipRemoveButton("Python")!.closest("span");
        expect(chip).toHaveAttribute("title", 'Possibly "Python & Jinja2"?');
    });

    it("does not show a hint for a chip that already matches a suggestion exactly", () => {
        render(<TokenCombobox id="stack" label="Stack" values={["Kotlin"]} onChange={vi.fn()} suggestions={SUGGESTIONS} />);

        const chip = chipRemoveButton("Kotlin")!.closest("span");
        expect(chip).not.toHaveAttribute("title");
    });
});
