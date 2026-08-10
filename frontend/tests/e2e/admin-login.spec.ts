import { expect, test } from "@playwright/test";

/**
 * The sign-in failure path, pinned at the level it was actually reported:
 * what the browser does.
 *
 * The bug: `adminApi.login()` went through the same wrapper that treats a
 * 401 as "your session died, go sign in" — so a wrong password navigated
 * to the sign-in page the visitor was already on. That wiped the error
 * message before it could render, and grew the `?from=` parameter by one
 * nested, re-encoded level per attempt:
 * `?from=%2Fadmin%2Flogin%3Ffrom%3D%252Fadmin%252Flogin%253Ffrom%253D...`
 *
 * Unit tests cover the pieces (`admin-api.test.ts`, `redirect-target.test.ts`);
 * this covers the thing a person experiences, which is what the report
 * described and what no unit test can claim.
 *
 * No credentials needed and no seeded admin user required — this only
 * exercises the REJECTED path, so it stays independent of whatever the
 * fixture database happens to contain.
 */
test("a wrong password shows an error and stays put, instead of bouncing back to the login page", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // The SERVER's message, not the session-expiry one. Asserting the exact
    // text is what makes this test discriminating rather than decorative:
    // with the bug, an alert still appeared — it just said "Your session
    // has expired. Please sign in again." to someone who had never signed
    // in, because the 401 had been reclassified as a dead session.
    // Scoped to the form: Next.js renders its own `role="alert"` route
    // announcer on every page, so an unscoped lookup matches two elements.
    await expect(page.locator("form").getByRole("alert")).toHaveText("Invalid email or password.");

    // The URL must be untouched: no navigation at all, and above all no
    // `?from=` pointing at this very page.
    expect(new URL(page.url()).pathname).toBe("/admin/login");
    expect(new URL(page.url()).search).toBe("");
});

test("a `from` pointing back at the login page is ignored rather than obeyed", async ({ page }) => {
    // Someone can still arrive at a URL like this — an old bookmark from
    // before the fix, or a hand-crafted link. It must not survive into a
    // post-sign-in navigation target.
    await page.goto("/admin/login?from=%2Fadmin%2Flogin%3Ffrom%3D%252Fadmin");

    await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/admin/login");
});
