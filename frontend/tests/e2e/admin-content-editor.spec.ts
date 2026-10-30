import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The standard prepare step resets only portfolio_test and creates this account.
test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email", { exact: true }).fill("editor-e2e@example.com");
    await page.getByLabel("Password", { exact: true }).fill("editor-e2e-password-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/);
});
async function panel(page: Page, name: "Body" | "Details" | "Actions") {
    const button = page
        .getByRole("navigation", { name: "Editor workspace" })
        .getByRole("button", { name, exact: true });
    if (await button.isVisible()) await button.click();
}
async function write(page: Page, text: string) {
    const body = page.locator(".bn-editor .bn-inline-content").first();
    await body.click();
    await page.keyboard.insertText(text);
}
async function saved(page: Page) {
    await expect(page.getByRole("status").filter({ hasText: /^Draft saved$/ })).toBeVisible();
}
async function flush(page: Page) {
    await page.getByRole("banner").click();
    await saved(page);
}
async function title(page: Page, text: string) {
    await panel(page, "Details");
    await page.getByRole("textbox", { name: /^(Title|Project title)$/ }).fill(text);
    await flush(page);
}
async function publish(page: Page) {
    await panel(page, "Actions");
    await page.getByRole("button", { name: "Review & publish", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Review publication" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Publish now", exact: true }).click();
    await expect(dialog).not.toBeVisible();
}

test("Journal starts with body, persists URL policy across reload and freezes it after publication", async ({
    page,
}, info) => {
    await page.goto("/admin/journal/new");
    await write(page, "An idea before its title.");
    await flush(page);
    await expect(page).toHaveURL(/\/admin\/journal\/[^/]+\/edit$/);
    const editAddress = page.url();
    await title(page, `Journal ${info.project.name}`);
    await title(page, `Revised ${info.project.name}`);
    await page.reload();
    await panel(page, "Details");
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(`Revised ${info.project.name}`);
    await expect(page.getByRole("region", { name: "Content URL" })).toContainText(
        `/journal/revised-${info.project.name.toLowerCase()}`,
    );
    expect(page.url()).toBe(editAddress);
    const category = page.getByRole("combobox", { name: "Category", exact: true });
    await category.fill("Engineering");
    await category.press("ArrowDown");
    await category.press("Enter");
    await page.getByLabel("Excerpt", { exact: true }).fill("A draft with body-first authoring.");
    await flush(page);
    await publish(page);
    const publishedAddress = page.url();
    await title(page, "Retitled after publication");
    await expect(page.getByRole("region", { name: "Content URL" })).toContainText(
        `/journal/revised-${info.project.name.toLowerCase()}`,
    );
    await panel(page, "Actions");
    await page.getByRole("button", { name: "Unpublish", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Unpublish", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await title(page, "Still the same address");
    expect(page.url()).toBe(publishedAddress);
    await page.getByRole("button", { name: "Edit URL", exact: true }).click();
    const urlDialog = page.getByRole("dialog", { name: "Edit URL" });
    await urlDialog.getByLabel("URL path").fill(`manual-${info.project.name.toLowerCase()}`);
    await urlDialog.getByRole("button", { name: "Apply URL" }).click();
    await flush(page);
    await page.reload();
    await panel(page, "Details");
    await title(page, "Manual stays stable");
    await expect(page.getByRole("region", { name: "Content URL" })).toContainText(
        `/journal/manual-${info.project.name.toLowerCase()}`,
    );
});

test("formatting, focus and compact panels preserve the document and undo history", async ({ page }) => {
    await page.goto("/admin/journal/new");
    await write(page, "Selected words");
    const inline = page.locator(".bn-editor .bn-inline-content").first();
    await inline.evaluate((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event("selectionchange"));
    });
    const toolbar = page.getByRole("toolbar", { name: "Body formatting" });
    await toolbar.getByRole("button", { name: "Bold", exact: true }).click();
    await expect(inline.locator("strong")).toHaveText("Selected words");
    await toolbar.getByRole("button", { name: "Insert link", exact: true }).click();
    await page.getByRole("dialog").getByLabel("Link URL").fill("https://example.com");
    await page.getByRole("button", { name: "Apply link", exact: true }).click();
    await expect(inline.locator("a")).toHaveAttribute("href", "https://example.com");
    const editorIdentity = await page.locator(".bn-editor").evaluate((node) => {
        node.setAttribute("data-test-identity", "same-editor");
        return node.getAttribute("data-test-identity");
    });
    await toolbar.getByRole("button", { name: "Focus", exact: true }).click();
    await toolbar.getByRole("button", { name: "Exit focus", exact: true }).click();
    await panel(page, "Details");
    await panel(page, "Body");
    await expect(page.locator(".bn-editor")).toHaveAttribute("data-test-identity", editorIdentity!);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(inline.locator("a")).toHaveCount(0);
    await toolbar.getByRole("button", { name: "Insert code block" }).click();
    await expect(page.locator('[data-content-type="codeSnippet"]')).toBeVisible();
    await expect(inline).toContainText("Selected words");
});

test("Work supports card-only publication and confirmed case-study removal", async ({ page }, info) => {
    await page.goto("/admin/work/new");
    await expect(
        page.getByRole("main", { name: "Writing canvas" }).getByRole("button", { name: "Add case study", exact: true }),
    ).toBeVisible();
    await title(page, `Project ${info.project.name}`);
    await page.getByLabel("Summary", { exact: true }).fill("A standalone project card.");
    await flush(page);
    await publish(page);
    await panel(page, "Body");
    await page
        .getByRole("main", { name: "Writing canvas" })
        .getByRole("button", { name: "Add case study", exact: true })
        .click();
    await write(page, "Case study body.");
    await flush(page);
    await panel(page, "Details");
    await page.getByRole("button", { name: "Case study", exact: true }).click();
    await page.getByRole("button", { name: /^Remove case study/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Keep case study" }).click();
    await panel(page, "Body");
    await expect(page.locator(".bn-editor")).toContainText("Case study body.");
    await panel(page, "Details");
    await page.getByRole("button", { name: /^Remove case study/ }).click();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: /^Remove case study/ })
        .click();
    await panel(page, "Body");
    await expect(
        page.getByRole("main", { name: "Writing canvas" }).getByRole("button", { name: "Add case study", exact: true }),
    ).toBeVisible();
});

test("save failures retain text and block review until retry succeeds", async ({ page }) => {
    await page.goto("/admin/journal/new");
    await page.route("**/api/admin/posts", (route) =>
        route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Storage unavailable" }),
        }),
    );
    await write(page, "Keep this text while offline.");
    await page.getByRole("banner").click();
    await expect(page.getByRole("status").filter({ hasText: "Save failed" })).toBeVisible();
    await panel(page, "Actions");
    await page.getByRole("button", { name: "Review & publish" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await panel(page, "Body");
    await expect(page.locator(".bn-editor")).toContainText("Keep this text while offline.");
    await page.unroute("**/api/admin/posts");
    await page.getByRole("button", { name: "Retry save" }).click();
    await saved(page);
});

for (const theme of ["light", "dark"])
    test(`workspace is accessible and fits viewport in ${theme} theme and zoom`, async ({ page }, info) => {
        await page.addInitScript((value) => localStorage.setItem("portfolio.theme-preference", value), theme);
        await page.goto("/admin/journal/new");
        await expect(page.locator(".bn-editor")).toBeVisible();
        for (const selected of ["Body", "Details", "Actions"] as const) {
            await panel(page, selected);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
        await panel(page, "Body");
        // A responsive CSS zoom checks clipping without assuming the runner's host display scale.
        await page.evaluate(() => {
            document.body.style.zoom = "1.25";
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.evaluate(() => {
            document.body.style.zoom = "";
        });
        const results = await new AxeBuilder({ page }).include(".content-editor-workspace").analyze();
        expect(results.violations).toEqual([]);
        await page.screenshot({ path: info.outputPath(`editor-${theme}.png`), fullPage: true });
    });

test("captures populated Journal, Work and publication review for the PR", async ({ page }, info) => {
    await page.goto("/admin/journal/flowbus/edit");
    await expect(page.locator(".bn-editor")).toBeVisible();
    await page.screenshot({ path: info.outputPath("journal.png"), fullPage: true });
    await panel(page, "Details");
    await page.getByLabel("Excerpt", { exact: true }).fill("A saved draft ready for publication review.");
    await flush(page);
    await panel(page, "Actions");
    await page.getByRole("button", { name: "Review changes", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Review publication" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("publication-review.png"), fullPage: true });
    await page.getByRole("button", { name: "Close Review publication" }).click();
    await page.goto("/admin/work/navigation-engine/edit");
    await expect(page.locator(".bn-editor")).toBeVisible();
    await page.screenshot({ path: info.outputPath("work.png"), fullPage: true });
    expect(await page.locator(".workspace-body").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await info.attach("work-layout", {
        body: JSON.stringify(
            await page.locator(".bn-inline-content").evaluateAll((nodes) =>
                nodes.map((node) => ({
                    text: node.textContent?.slice(0, 25),
                    x: node.getBoundingClientRect().x,
                    width: node.getBoundingClientRect().width,
                    whiteSpace: getComputedStyle(node).whiteSpace,
                    align: getComputedStyle(node).textAlign,
                })),
            ),
        ),
        contentType: "application/json",
    });
});
