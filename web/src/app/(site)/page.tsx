import { getFeaturedWork, getLatestPublishedPost, getSiteContent } from "@portfolio/backend";
import { LandingPage } from "@/views/landing";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

// Without this, Next.js prerenders this page once at BUILD time (no
// dynamic route params, no cookies()/headers() usage — everything it needs
// to auto-detect "this can be static" is absent) and bakes in whatever
// getFeaturedWork()/getLatestPublishedPost() returned during that build.
// That defeats the actual point of moving content into a database: a new
// post/project added later (Phase 4's admin panel) wouldn't show up here
// until the next full rebuild+redeploy — the exact problem this migration
// exists to remove. Forcing dynamic rendering means every request re-runs
// the query, same as /journal/[slug] and /work/[slug] already do (Next.js
// marks those dynamic automatically because of their route params).
// Revisit once Phase 4 wires up `revalidatePath()` on publish — on-demand
// static regeneration would give this back its build-time performance
// without losing correctness.
export const dynamic = "force-dynamic";

export default async function Page() {
    return renderOrServiceUnavailable(
        () =>
            Promise.all([
                getFeaturedWork(),
                getLatestPublishedPost(),
                getSiteContent("hero"),
                getSiteContent("contact"),
                getSiteContent("principles"),
                getSiteContent("techStack"),
                getSiteContent("config"),
            ]),
        ([featuredWork, latestPost, hero, contact, principles, techStack, config]) => (
            <LandingPage
                featuredWork={featuredWork}
                latestPost={latestPost}
                hero={hero}
                contact={contact}
                principles={principles}
                techStack={techStack}
                config={config}
            />
        ),
    );
}
