import { expect, test } from "@playwright/test";
import { visualFixturesManifest } from "./visual-fixtures.manifest";
import { seedTheme, THEMES } from "./utils/theme";

for (const entry of visualFixturesManifest) {
    for (const theme of THEMES) {
        test(`${entry.name} @ ${theme}`, async ({ page }) => {
            await seedTheme(page, theme);
            await page.goto(entry.path);
            await page.waitForLoadState("networkidle");

            // Array name -> nested folder: tests/visual-snapshots/<page>/<theme>-<viewport>.png,
            // one folder per page instead of 30 flat files (see frontend/tests/README.md, section 4).
            await expect(page).toHaveScreenshot([entry.name, `${theme}.png`], {
                fullPage: true,
            });
        });
    }
}
