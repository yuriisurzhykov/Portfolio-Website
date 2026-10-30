import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

it("names the dialog, handles cancel, and restores the triggering focus", () => {
    const onClose = vi.fn();
    const trigger = document.createElement("button"); document.body.append(trigger); trigger.focus();
    const { rerender } = render(<Dialog open title="Edit URL" onClose={onClose}><button>Apply URL</button></Dialog>);
    expect(screen.getByRole("dialog", { name: "Edit URL" })).toBeVisible();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<Dialog open={false} title="Edit URL" onClose={onClose}>Closed</Dialog>);
    expect(trigger).toHaveFocus();
    trigger.remove();
});
