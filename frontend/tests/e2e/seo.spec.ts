import { expect, test } from "@playwright/test";
import { pagesManifest } from "./pages.manifest";

/**
 * SEO — the invariants this whole area exists for, pinned at the level that
 * survives any reimplementation: what a crawler actually receives.
 *
 * Requires `SEO_INDEXABLE=true` and a public-looking `SITE_URL` in the
 * environment (`backend/.env.test` locally, job-level env in CI). Without
 * them the app under test is the noindex variant — i.e. NOT the one that
 * runs in production, leaving the branch that does run in production
 * covered by nothing. The first test below fails loudly in that case rather
 * than quietly asserting the wrong build.
 */

const EN_POST = "/journal/flowbus";
const OTHER_EN_POST = "/journal/testing-culture";
/** Translated — its Russian page is a page in its own right. */
const RU_POST = "/ru/journal/flowbus";
/** NOT translated — `/ru` renders the English body, so it must canonicalize back to English. */
const RU_UNTRANSLATED_POST = "/ru/journal/testing-culture";

async function head(page: import("@playwright/test").Page, selector: string, attribute: string): Promise<string | null> {
    return page.locator(selector).first().getAttribute(attribute);
}

test("robots.txt is served and allows crawling of the public site", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    // A bare `Disallow: /` here means the suite is testing the noindex
    // build — see this file's header.
    expect(body, "SEO_INDEXABLE=true must be set for this suite").not.toMatch(/^Disallow: \/$/m);
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Disallow: /api");
    expect(body).toContain("Disallow: /storybook");
    expect(body).toContain("Sitemap:");
});

test("robots.txt leaves /error crawlable on purpose", async ({ request }) => {
    // proxy.ts redirects a rate-limited visitor to /error/429; blocking the
    // path would point a crawler at a URL it may not fetch. `noindex` is
    // what keeps those pages out of the index instead — asserted below.
    const body = await (await request.get("/robots.txt")).text();
    expect(body).not.toContain("Disallow: /error");
});

test("a public page grants permission to show its OG card at full size", async ({ page }) => {
    // Without `max-image-preview: large` Google defaults to `standard` —
    // a thumbnail — and Discover eligibility is off entirely. This site
    // renders a 1200x630 card per page (see shared/lib/seo/og/), so the
    // absence of this directive would mean generating an image and then
    // withholding permission to display it.
    await page.goto(EN_POST);

    const robots = await head(page, 'meta[name="robots"]', "content");
    expect(robots).toContain("max-image-preview:large");
    expect(robots).toContain("index");
    expect(robots).not.toContain("noindex");
});

test("/error/429 is noindex even though it is crawlable", async ({ page }) => {
    await page.goto("/error/429");
    expect(await head(page, 'meta[name="robots"]', "content")).toContain("noindex");
});

test("/storybook is noindex", async ({ page }) => {
    await page.goto("/storybook");
    expect(await head(page, 'meta[name="robots"]', "content")).toContain("noindex");
});

test("/admin/login is noindex, even though it sits outside the (dashboard) group", async ({ page }) => {
    // It was NOT, and robots.txt's `Disallow: /admin` would not have saved
    // it — that forbids crawling, not indexing. The `noindex` used to live
    // on `(dashboard)/layout.tsx`, which this page deliberately isn't
    // under; it now lives on `admin/layout.tsx`, covering the whole
    // subtree. This test is what keeps that from regressing the next time
    // a public admin route is added.
    await page.goto("/admin/login");
    expect(await head(page, 'meta[name="robots"]', "content")).toContain("noindex");
});

test("two different posts have two different titles and descriptions", async ({ page }) => {
    // The single most valuable assertion here: before this work every page
    // on the site shared one static <title>, which is what makes a blog
    // invisible to search.
    await page.goto(EN_POST);
    const first = { title: await page.title(), description: await head(page, 'meta[name="description"]', "content") };

    await page.goto(OTHER_EN_POST);
    const second = { title: await page.title(), description: await head(page, 'meta[name="description"]', "content") };

    expect(first.title).not.toBe(second.title);
    expect(first.description).toBeTruthy();
    expect(second.description).toBeTruthy();
    expect(first.description).not.toBe(second.description);
});

test("a post page carries an absolute canonical and hreflang alternates", async ({ page }) => {
    await page.goto(EN_POST);

    const canonical = await head(page, 'link[rel="canonical"]', "href");
    expect(canonical).toMatch(/^https?:\/\/.+\/journal\/flowbus$/);

    const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) =>
        Object.fromEntries(nodes.map((node) => [node.getAttribute("hreflang"), node.getAttribute("href")])),
    );
    expect(Object.keys(alternates).sort()).toEqual(["en", "ru", "x-default"]);
    expect(alternates.ru).toContain("/ru/journal/flowbus");
});

test("a translated Russian page canonicalizes to itself", async ({ page }) => {
    await page.goto(RU_POST);
    expect(await head(page, 'link[rel="canonical"]', "href")).toContain("/ru/journal/flowbus");
});

test("an UNTRANSLATED Russian page canonicalizes to the English URL and declares no ru alternate", async ({ page }) => {
    // `/ru/journal/testing-culture` renders the English body (see
    // getPostBySlug's fallback). Declaring it a Russian version would be
    // untrue, and letting it self-canonicalize would create a duplicate.
    await page.goto(RU_UNTRANSLATED_POST);

    const canonical = await head(page, 'link[rel="canonical"]', "href");
    expect(canonical).toMatch(/\/journal\/testing-culture$/);
    expect(canonical).not.toContain("/ru/");

    const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("hreflang")),
    );
    expect(hreflangs).not.toContain("ru");
});

test("a renamed post's OLD address permanently redirects instead of 404ing", async ({ request }) => {
    // A rename would otherwise throw away everything the old URL earned:
    // external links break, and the IndexNow submission for the previous
    // slug sends a crawler to a 404, which drops the URL rather than
    // forwarding it. `seed-e2e-fixtures.ts` renames this post twice during
    // seeding so the history row exists without changing the fixture set.
    const response = await request.get("/journal/testing-culture-draft", { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toContain("/journal/testing-culture");
});

test("the redirect keeps the /ru prefix rather than dropping the visitor into English", async ({ request }) => {
    const response = await request.get("/ru/journal/testing-culture-draft", { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toContain("/ru/journal/testing-culture");
});

test("a slug that never existed still 404s — the redirect is not a catch-all", async ({ request }) => {
    expect((await request.get("/journal/never-was-a-post")).status()).toBe(404);
});

test("a post page emits a parseable JSON-LD graph with a resolvable author", async ({ page }) => {
    await page.goto(EN_POST);

    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const graph = JSON.parse(raw ?? "");

    expect(graph["@context"]).toBe("https://schema.org");
    const nodes: Record<string, unknown>[] = graph["@graph"];
    const post = nodes.find((node) => node["@type"] === "BlogPosting");
    const person = nodes.find((node) => node["@type"] === "Person");

    expect(post).toBeDefined();
    expect(person).toBeDefined();
    // The reason both nodes travel together: a validator does not follow an
    // `@id` to another page, so an author referenced but not present reads
    // as "missing field: name".
    expect((post as Record<string, { "@id": string }>).author["@id"]).toBe(person!["@id"]);
    expect(person!.name).toBeTruthy();
});

test("Open Graph and Twitter card are complete on a post", async ({ page }) => {
    await page.goto(EN_POST);

    expect(await head(page, 'meta[property="og:type"]', "content")).toBe("article");
    expect(await head(page, 'meta[property="og:site_name"]', "content")).toBeTruthy();
    // Underscore, not hyphen — a hyphen is silently ignored by consumers.
    expect(await head(page, 'meta[property="og:locale"]', "content")).toBe("en_US");
    expect(await head(page, 'meta[name="twitter:card"]', "content")).toBe("summary_large_image");
    expect(await head(page, 'meta[property="og:image"]', "content")).toBeTruthy();
});

test("sitemap.xml lists exactly the pages the page manifest lists", async ({ request }) => {
    // The static-route list exists twice in the repo — in `app/sitemap.ts`
    // and in `generate-pages-manifest.ts`'s `staticPages` — and cannot be
    // shared directly, because the second lives in a script that writes
    // JSON before Playwright starts. Both apply the identical `hasBody`/
    // `hasCaseStudy` guards, so the two sets have to match exactly. This is
    // the same trick `component-gallery.spec.ts` uses on its manifest, and
    // it turns "new public page forgotten in the sitemap" from silent into
    // a red build.
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const xml = await response.text();
    const sitemapPaths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => new URL(match[1]).pathname)
        .filter((pathname) => !pathname.startsWith("/ru"));

    expect(new Set(sitemapPaths)).toEqual(new Set(pagesManifest.map((entry) => entry.path)));
});

test("sitemap.xml never lists a URL that 404s", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);

    for (const pathname of urls) {
        expect((await request.get(pathname)).status(), pathname).toBe(200);
    }
});

test("the sitemap declares the Russian alternate only for translated content", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();

    expect(xml).toContain("/ru/journal/flowbus");
    expect(xml).not.toContain("/ru/journal/testing-culture");
});
