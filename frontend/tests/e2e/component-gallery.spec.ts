import { expect, test } from "@playwright/test";
import { componentGalleryManifest } from "./component-gallery.manifest";
import { seedTheme, THEMES } from "./utils/theme";

const STORYBOOK_PATH = "/storybook";

/**
 * Guards against the manifest and the live page drifting apart silently — same "fail loudly"
 * philosophy as `visual-fixtures.manifest.ts`'s own stale-fixture check, just enforced at test-run
 * time instead of import time, since these ids come from a rendered page, not a generated file.
 */
test("component gallery manifest matches the live /storybook page", async ({ page }) => {
    await page.goto(STORYBOOK_PATH);
    await page.waitForLoadState("networkidle");

    const idsOnPage = await page.locator("[data-component-id]").evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-component-id")),
    );

    expect(new Set(idsOnPage)).toEqual(new Set(componentGalleryManifest.map((entry) => entry.id)));
});

for (const entry of componentGalleryManifest) {
    for (const theme of THEMES) {
        test(`${ entry.label } @ ${ theme }`, async ({ page }) => {
            await seedTheme(page, theme);
            await page.goto(STORYBOOK_PATH);
            await page.waitForLoadState("networkidle");

            const locator = page.locator(`[data-component-id="${ entry.id }"]`);
            await locator.scrollIntoViewIfNeeded();

            // "components" prefix keeps these in their own subtree of visual-snapshots/, separate
            // from the page-level folders visual.spec.ts writes (home/, work-list/, ...).
            await expect(locator).toHaveScreenshot(["components", entry.id, `${ theme }.png`]);
        });
    }
}
