import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "./I18nContext";
import { useTranslation } from "./useTranslation";

function LnProbe({ i18nKey }: { i18nKey: string }) {
    const { ln } = useTranslation();
    return <div data-testid="probe">{ln(i18nKey)}</div>;
}

function PickProbe() {
    const { pick } = useTranslation();
    return <div data-testid="probe">{pick({ en: "Hello", ru: "Привет" })}</div>;
}

describe("I18nProvider — first-render behavior (the actual FOUC regression test)", () => {
    it("shows the real translation on the very first render, synchronously — this is the bug report's exact scenario", () => {
        render(
            <I18nProvider>
                <LnProbe i18nKey="nav.work" />
            </I18nProvider>,
        );

        // Deliberately no `waitFor`/`findBy`/`act(async ...)` anywhere in this
        // test — reaching for one of those would itself smuggle the old bug
        // back in: it would mean "the real text only shows up after waiting
        // for something," which is precisely what a visitor's very first
        // paint can't afford, since there's no user interaction to wait
        // through in that split second.
        expect(screen.getByTestId("probe").textContent).toBe("Work");
    });

    it("never renders the raw key as a fallback for a real, known key", () => {
        render(
            <I18nProvider>
                <LnProbe i18nKey="nav.journal" />
            </I18nProvider>,
        );

        expect(screen.queryByText("nav.journal")).not.toBeInTheDocument();
        expect(screen.getByText("Journal")).toBeInTheDocument();
    });

    it("still falls back to the raw key for a key that genuinely doesn't exist (not a regression, a distinct correct behavior)", () => {
        render(
            <I18nProvider>
                <LnProbe i18nKey="this.key.does.not.exist" />
            </I18nProvider>,
        );

        expect(screen.getByTestId("probe").textContent).toBe("this.key.does.not.exist");
    });

    it("pick() resolves the default (English) language on first render with no async wait either", () => {
        render(
            <I18nProvider>
                <PickProbe />
            </I18nProvider>,
        );

        expect(screen.getByTestId("probe").textContent).toBe("Hello");
    });
});
