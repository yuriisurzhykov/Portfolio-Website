import type { MetadataRoute } from "next";
import { IS_INDEXABLE, SITE_URL } from "@/shared/lib/seo/site-url";

// Without this Next.js prerenders robots.txt at BUILD time — and the
// production build happens in GitHub Actions, where `SEO_INDEXABLE` and
// `SITE_URL` (which live in `shared/.env` on the server, see
// deploy-target.yml) do not exist. The deployed file would then say
// `Disallow: /` permanently, no matter what the running process's
// environment says. Caught by reading `next build`'s route table, which
// listed this as `○ (Static)`; `sitemap.ts` carries the same line for the
// neighbouring reason (content changing without a redeploy).
export const dynamic = "force-dynamic";

/**
 * One `User-agent: *` block, no per-bot rules.
 *
 * AI crawlers are deliberately NOT blocked. Vendors now run separate
 * training and search agents (`GPTBot` vs `OAI-SearchBot`, `ClaudeBot` vs
 * `Claude-SearchBot`), so a broad block mostly removes the agents that
 * produce citations. Any narrow rule written here risks catching a search
 * bot by pattern instead of the training one it was aimed at, and the goal
 * of a personal blog is reach.
 *
 * `/error` is deliberately left crawlable, even though closing it looks
 * obvious. `proxy.ts` redirects a visitor over the rate-limit budget to
 * `/error/429`; disallowing that path would mean redirecting a crawler to
 * a URL it is forbidden to fetch, leaving the original page with no
 * content at all — worse than either half on its own. Those pages are kept
 * out of the index by `noindex` instead, which — unlike `Disallow` — only
 * works if the page may be fetched in the first place.
 */
export default function robots(): MetadataRoute.Robots {
    if (!IS_INDEXABLE) {
        return { rules: { userAgent: "*", disallow: "/" } };
    }

    return {
        rules: { userAgent: "*", disallow: ["/admin", "/api", "/storybook"] },
        sitemap: `${ SITE_URL }/sitemap.xml`,
    };
}
