import { expect, test } from "@playwright/test";

/**
 * OG-image baselines — screenshots of the ROUTE's output, not of the
 * template rendered as an ordinary component.
 *
 * That distinction is the whole reason this file exists. satori has no
 * system fonts at all: everything it draws comes from the buffers
 * `shared/lib/seo/og/fonts.ts` hands it. A browser, by contrast, silently
 * falls back to a system font and draws Cyrillic correctly — so a
 * component-level screenshot of the same template would stay green with a
 * completely broken font subset, while the real card came out as "tofu".
 *
 * Same mechanism as `visual.spec.ts` (navigate, `toHaveScreenshot`, and the
 * existing `/update-snapshots` workflow for baselines), but a separate spec
 * and Desktop-only: an OG image has no theme, so there are three baselines
 * here rather than six. `component-gallery.spec.ts` is the wrong home by
 * construction — it is about components, and these are routes.
 */

const OG_ROUTES = [
    { name: "og-default", path: "/opengraph-image" },
    // Explicit routes, not `opengraph-image.tsx` under a dynamic segment —
    // Next.js gives those a content-hashed URL nothing outside it can name.
    // See `shared/lib/seo/og/paths.ts`.
    { name: "og-journal-en", path: "/journal/flowbus/og-image/en" },
    // The Russian pair is the point of this whole spec: `flowbus` and
    // `navigation-engine` are the two translated fixtures, so these are the
    // only baselines where Cyrillic is actually drawn — and therefore the
    // only ones that can catch a font subset that lost it.
    { name: "og-journal-ru", path: "/journal/flowbus/og-image/ru" },
    { name: "og-work-ru", path: "/work/navigation-engine/og-image/ru" },
];

for (const route of OG_ROUTES) {
    test(`${ route.name } renders`, async ({ page }) => {
        const response = await page.goto(route.path);

        expect(response?.status()).toBe(200);
        expect(response?.headers()["content-type"]).toContain("image/png");

        // The browser displays a bare image as a centered <img> on its own
        // page — screenshotting that element is what compares the actual
        // PNG bytes' rendering, not the surrounding chrome.
        await expect(page.locator("img")).toHaveScreenshot([route.name, "desktop.png"]);
    });
}
