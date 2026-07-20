import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Drawer } from "./Drawer";

describe("Drawer", () => {
    it("hides the panel from the accessibility tree and tab order while closed", () => {
        render(
            <Drawer open={false} onClose={() => {}} aria-label="Test drawer">
                <button type="button">Inside</button>
            </Drawer>,
        );

        const dialog = screen.getByRole("dialog", { hidden: true });
        expect(dialog).toHaveAttribute("aria-hidden", "true");
        expect(dialog).toHaveAttribute("inert");
    });

    it("exposes the panel to the accessibility tree while open", () => {
        render(
            <Drawer open onClose={() => {}} aria-label="Test drawer">
                <button type="button">Inside</button>
            </Drawer>,
        );

        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveAttribute("aria-hidden", "false");
        expect(dialog).not.toHaveAttribute("inert");
    });

    it("calls onClose when the backdrop is clicked", async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(
            <Drawer open onClose={onClose} aria-label="Test drawer">
                <button type="button">Inside</button>
            </Drawer>,
        );

        // The backdrop is the sibling `aria-hidden` element rendered before
        // the dialog — grabbed by its role-less nature via a class hook
        // instead of text, since it has no accessible content of its own.
        const backdrop = document.querySelector('[aria-hidden="true"].bg-overlay-scrim');
        expect(backdrop).not.toBeNull();
        await user.click(backdrop as Element);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape is pressed while open", async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(
            <Drawer open onClose={onClose} aria-label="Test drawer">
                <button type="button">Inside</button>
            </Drawer>,
        );

        await user.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose on Escape while already closed", async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(
            <Drawer open={false} onClose={onClose} aria-label="Test drawer">
                <button type="button">Inside</button>
            </Drawer>,
        );

        await user.keyboard("{Escape}");

        expect(onClose).not.toHaveBeenCalled();
    });

    /**
     * The actual bug this guards against, found via a live mobile
     * screenshot, not a code review: rendering `<Drawer/>` nested inside an
     * element with `backdrop-filter` (`Nav`'s `<header>` has
     * `backdrop-blur-md`) made the panel's `position: fixed` resolve
     * relative to that header instead of the viewport — per the CSS spec,
     * `backdrop-filter`/`filter`/`transform` on an ancestor creates a new
     * containing block for `position: fixed` descendants. The panel
     * visually collapsed into the header's own (short) box instead of
     * covering the screen. Portaling to `document.body` (see the comment
     * on the component) is what fixes it — this test asserts the portal
     * target directly, so a future refactor that accidentally renders the
     * drawer inline again fails here, not just as an in-person "why does
     * this look broken" report.
     */
    it("renders into document.body via a portal — never trapped inside a styled ancestor's DOM subtree", () => {
        function FilteredAncestor() {
            return (
                <div data-testid="filtered-wrapper" style={{ backdropFilter: "blur(4px)" }}>
                    <Drawer open onClose={() => {}} aria-label="Test drawer">
                        <button type="button">Inside</button>
                    </Drawer>
                </div>
            );
        }

        render(<FilteredAncestor />);

        const wrapper = screen.getByTestId("filtered-wrapper");
        const dialog = screen.getByRole("dialog");

        expect(wrapper.contains(dialog)).toBe(false);
        expect(document.body.contains(dialog)).toBe(true);
    });

    it("locks body scroll while open and restores it on close", () => {
        const { rerender } = render(
            <Drawer open onClose={() => {}} aria-label="Test drawer">
                <button type="button">Inside</button>
            </Drawer>,
        );
        expect(document.body.style.overflow).toBe("hidden");

        rerender(
            <Drawer open={false} onClose={() => {}} aria-label="Test drawer">
                <button type="button">Inside</button>
            </Drawer>,
        );
        expect(document.body.style.overflow).not.toBe("hidden");
    });
});
