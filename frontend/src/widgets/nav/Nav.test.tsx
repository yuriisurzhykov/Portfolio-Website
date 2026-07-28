import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SITE_CONTENT_DEFAULTS } from "@portfolio/backend";
import { I18nProvider } from "@/shared/i18n";
import { ThemeProvider } from "@/shared/theme";
import { Nav } from "./Nav";

vi.mock("next/navigation", () => ({
    usePathname: () => "/",
}));

function renderNav() {
    return render(
        <ThemeProvider>
            <I18nProvider>
                <Nav config={SITE_CONTENT_DEFAULTS.config} />
            </I18nProvider>
        </ThemeProvider>,
    );
}

describe("Nav — mobile menu", () => {
    it("the mobile menu panel starts closed", () => {
        renderNav();
        expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("aria-hidden", "true");
    });

    it("opens the mobile menu panel when the hamburger button is clicked", async () => {
        const user = userEvent.setup();
        renderNav();

        await user.click(screen.getByRole("button", { name: "Open menu" }));

        expect(screen.getByRole("dialog")).toHaveAttribute("aria-hidden", "false");
    });

    it("closes the mobile menu when its own close button is clicked", async () => {
        const user = userEvent.setup();
        renderNav();

        await user.click(screen.getByRole("button", { name: "Open menu" }));
        expect(screen.getByRole("dialog")).toHaveAttribute("aria-hidden", "false");

        await user.click(screen.getByRole("button", { name: "Close menu" }));
        expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("aria-hidden", "true");
    });

    it("closes the mobile menu when a nav link inside it is clicked", async () => {
        const user = userEvent.setup();
        renderNav();

        await user.click(screen.getByRole("button", { name: "Open menu" }));
        const dialog = screen.getByRole("dialog");

        // The mobile menu renders its own copy of the Work/Journal/Contact
        // links (see Nav.tsx's `mobileNavLinkClass` block) — scoped to the
        // dialog specifically, since the desktop nav (hidden, not removed,
        // on this viewport) also has a "Work" link in the document.
        const workLink = within(dialog).getByRole("link", { name: "Work" });
        await user.click(workLink);

        expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("aria-hidden", "true");
    });
});
