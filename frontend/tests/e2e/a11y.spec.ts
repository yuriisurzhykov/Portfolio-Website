import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { pagesManifest } from "./pages.manifest";
import { seedTheme, THEMES } from "./utils/theme";

type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;
type AxeViolation = AxeResults["violations"][number];

/**
 * axe-core impact levels that fail the build outright. "moderate"/"minor" violations are still
 * captured (attached to the test result + surfaced in the PR summary) but don't fail CI — they're
 * worth fixing, but gating every merge on them would be too strict for a one-person portfolio
 * repo. Tighten this set later if desired.
 */
const BLOCKING_IMPACTS = new Set(["critical", "serious"]);

for (const entry of pagesManifest) {
    for (const theme of THEMES) {
        test(`${entry.name} @ ${theme} - a11y`, async ({ page }, testInfo) => {
            await seedTheme(page, theme);
            await page.goto(entry.path);
            await page.waitForLoadState("networkidle");

            const results = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
                .analyze();

            await testInfo.attach("axe-results", {
                body: JSON.stringify(results.violations, null, 2),
                contentType: "application/json",
            });

            const blocking = results.violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""));

            expect(blocking, formatViolations(blocking)).toEqual([]);
        });
    }
}

function formatViolations(violations: AxeViolation[]): string {
    if (violations.length === 0) return "";

    const lines = violations.map((violation) => {
        const selectors = violation.nodes.map((node) => node.target.join(" ")).join(", ");
        return `- [${violation.impact}] ${violation.id}: ${violation.help} (${selectors})`;
    });

    return `Accessibility violations found:\n${lines.join("\n")}`;
}
