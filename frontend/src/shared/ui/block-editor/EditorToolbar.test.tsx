import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EditorToolbar, type EditorCommand } from "./EditorToolbar";

it("delegates actual formatting intents and prevents commands while readonly", () => {
    const commands: EditorCommand[] = [];
    const props = {
        onCommand: (command: EditorCommand) => commands.push(command),
        focusMode: false,
        onFocusModeChange() {},
    };
    const { rerender } = render(<EditorToolbar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));
    expect(commands).toEqual(["bold", "insert"]);
    rerender(<EditorToolbar {...props} readOnly />);
    fireEvent.click(screen.getByRole("button", { name: "Italic" }));
    expect(commands).toEqual(["bold", "insert"]);
});

it("prevents converting custom blocks through the text-only block type control", () => {
    render(
        <EditorToolbar
            onCommand={() => {}}
            focusMode={false}
            onFocusModeChange={() => {}}
            canChangeBlockType={false}
        />,
    );
    expect(screen.getByRole("combobox", { name: "Block type" })).toBeDisabled();
});
