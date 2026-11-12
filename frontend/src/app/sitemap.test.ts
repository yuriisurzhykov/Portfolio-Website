import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@portfolio/backend", () => ({ getJournalEntries: vi.fn(), getAllWork: vi.fn() }));
vi.mock("@/shared/lib/seo/site-url", () => ({ SITE_URL: "https://example.com" }));
import { getAllWork, getJournalEntries, type PostSummary, type WorkSummary } from "@portfolio/backend";
import sitemap from "./sitemap";

function post(overrides: Partial<PostSummary>): PostSummary {
    return { slug: "post", date: "2026-11-01", title: { en: "Title", ru: "" }, category: { en: "Category", ru: "" },
        readMins: 1, excerpt: { en: "Excerpt", ru: "" }, status: "published", relatedWorkSlug: null,
        lifecycleState: "PUBLISHED", publishedAt: null, contentUpdatedAt: null, hasBody: true, availableLocales: ["en"], cover: null, ...overrides };
}

function work(overrides: Partial<WorkSummary>): WorkSummary {
    return { slug: "work", date: "2026-11-01", title: { en: "Title", ru: "" }, status: "shipped", summary: { en: "Summary", ru: "" },
        stack: [], coverImage: null, featured: false, relatedPostSlug: null, cover: null, hasCaseStudy: true,
        lifecycleState: "PUBLISHED", publishedAt: null, contentUpdatedAt: null, availableLocales: ["en"], ...overrides };
}

describe("sitemap", () => {
    beforeEach(() => {
        vi.mocked(getJournalEntries).mockResolvedValue([]);
        vi.mocked(getAllWork).mockResolvedValue([]);
    });

    it("lists each static language URL as its own entry with reciprocal alternates", async () => {
        const entries = await sitemap();
        expect(entries.map((entry) => entry.url)).toEqual([
            "https://example.com/", "https://example.com/ru",
            "https://example.com/journal", "https://example.com/ru/journal",
            "https://example.com/work", "https://example.com/ru/work",
        ]);
        for (const url of ["https://example.com/", "https://example.com/ru"]) {
            expect(entries.find((entry) => entry.url === url)?.alternates?.languages).toEqual({
                en: "https://example.com/", ru: "https://example.com/ru", "x-default": "https://example.com/",
            });
        }
    });

    it("lists translated details separately, excludes fallbacks and non-renderable content, and preserves lastmod", async () => {
        vi.mocked(getJournalEntries).mockResolvedValue([
            post({ slug: "translated", status: "published", hasBody: true, availableLocales: ["en", "ru"], contentUpdatedAt: "2026-11-01T00:00:00.000Z" }),
            post({ slug: "english", status: "published", hasBody: true, availableLocales: ["en"], publishedAt: "2026-10-01T00:00:00.000Z" }),
            post({ slug: "upcoming", status: "upcoming", hasBody: false, availableLocales: ["en"] }),
            post({ slug: "empty", status: "published", hasBody: false, availableLocales: ["en"] }),
        ]);
        vi.mocked(getAllWork).mockResolvedValue([
            work({ slug: "project", hasCaseStudy: true, availableLocales: ["en", "ru"] }),
            work({ slug: "card-only", hasCaseStudy: false, availableLocales: ["en"] }),
        ]);
        const entries = (await sitemap()).filter((entry) => /\/(journal|work)\//.test(entry.url));
        expect(entries.map((entry) => entry.url)).toEqual([
            "https://example.com/journal/translated", "https://example.com/ru/journal/translated",
            "https://example.com/journal/english",
            "https://example.com/work/project", "https://example.com/ru/work/project",
        ]);
        expect(entries[1].lastModified).toBe("2026-11-01T00:00:00.000Z");
        expect(entries[2].lastModified).toBe("2026-10-01T00:00:00.000Z");
        expect(entries[0].alternates).toEqual(entries[1].alternates);
        expect(entries[2].alternates?.languages).not.toHaveProperty("ru");
    });
});
