import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/seo/site-url", () => ({ SITE_URL: "https://example.com", IS_INDEXABLE: true }));
import robots from "./robots";

describe("robots", () => {
    it("keeps crawlers away from the privacy policy of the mobile app and from its /ru rewrite", () => {
        const rules = robots().rules;
        const block = Array.isArray(rules) ? rules[0] : rules;

        expect(block.disallow).toEqual(expect.arrayContaining(["/privacy", "/ru/privacy"]));
    });

    it("still lets crawlers read the public site and points them to the sitemap", () => {
        const result = robots();
        const block = Array.isArray(result.rules) ? result.rules[0] : result.rules;

        expect(block.disallow).not.toContain("/");
        expect(result.sitemap).toBe("https://example.com/sitemap.xml");
    });
});
