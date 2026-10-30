import * as React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ContentEditorWorkspace } from "./ContentEditorWorkspace";

it("preserves the same body instance while switching panels and focus mode", () => {
    let mounts = 0;
    function Body() {
        React.useEffect(() => {
            mounts++;
        }, []);
        return <textarea aria-label="Body" defaultValue="Keep this draft" />;
    }
    const body = <Body />;
    const props = {
        statusBar: <div>Saved</div>,
        properties: <div>Details</div>,
        body,
        actions: <div>Publish</div>,
        compactPanel: "body" as const,
        onCompactPanelChange() {},
        focusMode: false,
        onFocusModeChange() {},
    };
    const { rerender } = render(<ContentEditorWorkspace {...props} />);
    const input = screen.getByRole<HTMLTextAreaElement>("textbox");
    input.value = "Edited draft";
    rerender(<ContentEditorWorkspace {...props} compactPanel="details" focusMode />);
    rerender(<ContentEditorWorkspace {...props} />);
    expect(mounts).toBe(1);
    expect(screen.getByRole("textbox")).toBe(input);
    expect(input.value).toBe("Edited draft");
});
