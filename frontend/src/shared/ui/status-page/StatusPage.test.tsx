import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { I18nProvider } from "@/shared/i18n";
import { StatusPage } from "./StatusPage";

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));

afterEach(() => {
    vi.mocked(useRouter).mockReset();
});

function renderStatus(props: Parameters<typeof StatusPage>[0]) {
    return render(
        <I18nProvider>
            <StatusPage {...props} />
        </I18nProvider>,
    );
}

describe("StatusPage — per-code content", () => {
    it("renders genuinely distinct headings for different codes, not the same copy repeated", () => {
        const { unmount } = renderStatus({ code: 429 });
        const rateLimitHeading = screen.getByRole("heading", { level: 1 }).textContent;
        unmount();

        renderStatus({ code: 400 });
        const badRequestHeading = screen.getByRole("heading", { level: 1 }).textContent;

        expect(rateLimitHeading).not.toBe(badRequestHeading);
        expect(rateLimitHeading).toMatch(/speed racer/i);
        expect(badRequestHeading).toMatch(/parse/i);
    });

    it("shows the actual HTTP number and its formal name in the eyebrow", () => {
        renderStatus({ code: 503 });
        expect(screen.getByText("HTTP 503 · Service Unavailable")).toBeInTheDocument();
    });

    it("404 gets its own copy, distinct from 400's, even though both share the 'home' action", () => {
        const { unmount } = renderStatus({ code: 404 });
        const notFoundHeading = screen.getByRole("heading", { level: 1 }).textContent;
        unmount();

        renderStatus({ code: 400 });
        const badRequestHeading = screen.getByRole("heading", { level: 1 }).textContent;

        expect(notFoundHeading).not.toBe(badRequestHeading);
        expect(notFoundHeading).toMatch(/wandered off the map/i);
    });

    it("folds a known retryAfterSeconds into the description instead of the generic copy", () => {
        renderStatus({ code: 429, retryAfterSeconds: 42 });
        expect(screen.getByText(/about 42s/)).toBeInTheDocument();
    });

    it("falls back to the generic description when retryAfterSeconds is not known", () => {
        renderStatus({ code: 429 });
        expect(screen.queryByText(/about \d+s/)).not.toBeInTheDocument();
        expect(screen.getByText(/take a breather/i)).toBeInTheDocument();
    });
});

describe("StatusPage — primary action per code", () => {
    it("400 (home action): the ONE call to action is a link home, no duplicate secondary link", () => {
        renderStatus({ code: 400 });
        const homeLinks = screen.getAllByRole("link", { name: /back home/i });
        expect(homeLinks).toHaveLength(1);
        expect(homeLinks[0]).toHaveAttribute("href", "/");
    });

    it("401 (signIn action): links to /admin/login, appending ?from= when provided", () => {
        renderStatus({ code: 401, from: "/admin/journal/my-post/edit" });
        const signInLink = screen.getByRole("link", { name: "Sign in" });
        expect(signInLink).toHaveAttribute(
            "href",
            "/admin/login?from=%2Fadmin%2Fjournal%2Fmy-post%2Fedit",
        );
    });

    it("401 without a from: links to a bare /admin/login", () => {
        renderStatus({ code: 401 });
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/admin/login");
    });

    it("429/500/503 (retry action): the primary control is a real <button>, not a link", () => {
        renderStatus({ code: 429 });
        expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Try again" })).not.toBeInTheDocument();
    });

    it("clicking retry calls the provided onRetry instead of router.refresh", async () => {
        const refresh = vi.fn();
        vi.mocked(useRouter).mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>);
        const onRetry = vi.fn();
        const user = userEvent.setup();

        renderStatus({ code: 500, onRetry });
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(refresh).not.toHaveBeenCalled();
    });

    it("clicking retry with no onRetry falls back to router.refresh", async () => {
        const refresh = vi.fn();
        vi.mocked(useRouter).mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>);
        const user = userEvent.setup();

        renderStatus({ code: 500 });
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it("a retry-action code (503) still shows a secondary back-home link alongside the retry button", () => {
        renderStatus({ code: 503 });
        expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /back home/i })).toHaveAttribute("href", "/");
    });
});
