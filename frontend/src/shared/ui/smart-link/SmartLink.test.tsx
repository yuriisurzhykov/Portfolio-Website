import * as React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { LinkPreviewMap, LinkPreviewView } from "@portfolio/backend";
import { I18nProvider } from "@/shared/i18n";
import { Markdown } from "@/shared/ui/markdown";
import { LinkPreviewProvider } from "./LinkPreviewContext";
import { SmartLinkBlock } from "./SmartLinkBlock";

const REPO_URL = "https://github.com/yuriisurzhykov/Portfolio-Website";

function preview(overrides: Partial<LinkPreviewView> = {}): LinkPreviewView {
    return {
        url: REPO_URL,
        kind: "external",
        title: "Portfolio-Website",
        description: "Source of this site",
        siteName: "GitHub",
        domain: "github.com",
        image: null,
        faviconUrl: null,
        hue: null,
        status: "ok",
        lastError: null,
        ...overrides,
    };
}

function renderWith(previews: LinkPreviewMap, node: React.ReactNode) {
    return render(
        <I18nProvider initialLanguage="en">
            <LinkPreviewProvider previews={ previews }>{ node }</LinkPreviewProvider>
        </I18nProvider>,
    );
}

describe("inline smart link in Markdown", () => {
    const text = `See [the repo](${ REPO_URL } "smart") for details.`;

    it("renders the badge with the page's own title when a preview exists", () => {
        const { container } = renderWith({ [REPO_URL]: preview() }, <Markdown text={ text }/>);
        const link = container.querySelector("a");
        expect(link?.textContent).toContain("Portfolio-Website");
        expect(link?.getAttribute("target")).toBe("_blank");
        expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("falls back to the plain link the author wrote when there is no preview", () => {
        const { container } = renderWith({}, <Markdown text={ text }/>);
        const link = container.querySelector("a");
        expect(link?.textContent).toBe("the repo");
        expect(link?.getAttribute("href")).toBe(REPO_URL);
    });

    it("never leaks the \"smart\" marker into the page as a tooltip", () => {
        const withPreview = renderWith({ [REPO_URL]: preview() }, <Markdown text={ text }/>);
        expect(withPreview.container.querySelector("[title=\"smart\"]")).toBeNull();
        withPreview.unmount();
        const without = renderWith({}, <Markdown text={ text }/>);
        expect(without.container.querySelector("[title=\"smart\"]")).toBeNull();
    });

    it("keeps an ordinary link's own title", () => {
        const { container } = renderWith({}, <Markdown text={ `[x](${ REPO_URL } "Hello")` }/>);
        expect(container.querySelector("a")?.getAttribute("title")).toBe("Hello");
    });
});

describe("SmartLinkBlock", () => {
    it("renders the card with the title override instead of the page title", () => {
        const { container } = renderWith({ [REPO_URL]: preview() }, <SmartLinkBlock url={ REPO_URL } view="card" titleOverride="My repo"/>);
        expect(container.textContent).toContain("My repo");
        expect(container.textContent).not.toContain("Portfolio-Website");
    });

    it("is a plain, still-informative link when the snapshot has no title", () => {
        const { container } = renderWith({}, <SmartLinkBlock url={ REPO_URL } view="row"/>);
        const link = container.querySelector("a");
        expect(link?.getAttribute("href")).toBe(REPO_URL);
        expect(link?.textContent).toContain("github.com");
    });

    it("uses the preview it is handed (the editor's) over the page context", () => {
        const { container } = renderWith({}, <SmartLinkBlock url={ REPO_URL } view="row" preview={ preview({ title: "From editor" }) }/>);
        expect(container.textContent).toContain("From editor");
    });

    it("links own content in the same tab", () => {
        const { container } = renderWith({}, <SmartLinkBlock url="/work/demo" view="row" preview={ preview({ url: "/work/demo", kind: "work", hue: 210, domain: "" }) }/>);
        expect(container.querySelector("a")?.getAttribute("target")).toBeNull();
    });
});
