/**
 * Grabs real screenshots of the running dev server (both themes) for the WCAG-vs-APCA
 * discussion — specifically the Storybook page's "TechIcon" section, which renders
 * `text-accent-solid` (the vibrant brand orange used directly as icon/text color) with NO hover
 * interaction needed, so it's a stable, reproducible target. Companion to
 * `contrast-report.ts` (the numeric side of the same comparison).
 *
 * One-off, not part of any test suite. Run with the dev server already up:
 *   npx tsx scripts/contrast-screenshots.ts <baseUrl> <outDir>
 */
import { chromium } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const THEME_STORAGE_KEY = "portfolio.theme-preference";

async function main() {
    const baseUrl = process.argv[2] ?? "http://127.0.0.1:3100";
    const outDir = process.argv[3] ?? "/tmp/contrast-screenshots";
    fs.mkdirSync(outDir, { recursive: true });

    const browser = await chromium.launch();

    for (const theme of ["dark", "light"] as const) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.addInitScript(
            ([key, value]) => {
                window.localStorage.setItem(key, value);
            },
            [THEME_STORAGE_KEY, theme] as const,
        );
        const page = await context.newPage();
        await page.goto(`${ baseUrl }/storybook`);
        await page.waitForLoadState("networkidle");

        const section = page.locator('[data-component-id="tech-icon"]');
        await section.scrollIntoViewIfNeeded();
        await section.screenshot({ path: path.join(outDir, `tech-icon-${ theme }.png`) });

        const badgeSection = page.locator('[data-component-id="status-badge"]');
        if (await badgeSection.count() > 0) {
            await badgeSection.scrollIntoViewIfNeeded();
            await badgeSection.screenshot({ path: path.join(outDir, `status-badge-${ theme }.png`) });
        }

        await page.screenshot({ path: path.join(outDir, `storybook-top-${ theme }.png`) });

        await context.close();
    }

    for (const theme of ["dark", "light"] as const) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.addInitScript(
            ([key, value]) => {
                window.localStorage.setItem(key, value);
            },
            [THEME_STORAGE_KEY, theme] as const,
        );
        const page = await context.newPage();
        await page.goto(`${ baseUrl }/`);
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await page.screenshot({ path: path.join(outDir, `home-${ theme }.png`) });
        await context.close();
    }

    await browser.close();
    console.log(`Screenshots written to ${ outDir }`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
