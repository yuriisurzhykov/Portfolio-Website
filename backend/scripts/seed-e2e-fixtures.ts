import "dotenv/config";
import { createPost, publishPost, savePostDraft, translatePost } from "../src/content/admin-posts";
import { createWork, publishWork, translateWork } from "../src/content/admin-work";
import { resetTestDatabase } from "../src/test-utils/db";
import { prisma } from "../src/db/client";

/**
 * SEED E2E FIXTURES — deterministic content for web/tests/'s Playwright suite.
 * -----------------------------------------------------------------------------
 * Run with `dotenv -e .env.test -- tsx scripts/seed-e2e-fixtures.ts` (see
 * `npm run seed-e2e-fixtures`) — ALWAYS against `.env.test`'s `portfolio_test`
 * database, NEVER the real dev database (`.env`'s `portfolio`). This is the
 * one thing this script exists to guarantee: `web/`'s Playwright suite must
 * never depend on whatever happens to be in the developer's live dev content
 * at the moment someone runs the tests — that content changes constantly
 * (new work items, new posts) as the actual site evolves, which is exactly
 * what made an earlier version of this suite unstable (it queried `.env`'s
 * real dev DB directly — see `web/tests/README.md`'s dated correction entry
 * for the full story of why that was wrong, not just a note that it changed).
 *
 * Unlike `seed-site-content.ts` (idempotent — never overwrites, keeps a real
 * admin's edits), this one is a hard RESET-then-seed: visual/a11y coverage
 * needs the exact same fixed content every single run, not "whatever was
 * left over from the last run plus these on top." `resetTestDatabase()` is
 * the same helper `backend/`'s own Vitest integration tests already use
 * between tests — reused here, not reimplemented, since "wipe every table"
 * is exactly the same operation either way.
 *
 * Content is realistic in STRUCTURE (mirrors the real site's template
 * variants) but is clearly fixture data, not a copy of the real personal
 * portfolio — this is a test double, and pretending otherwise would be
 * actively misleading to anyone who stumbles on it later.
 *
 * `createWork`/`createPost` (the same functions the admin panel's API routes
 * call) are reused rather than raw `prisma.work.create`/`prisma.post.create`
 * calls — they already handle `Document`/`Block` creation for case
 * studies/bodies correctly (see admin-work.ts/admin-posts.ts), so duplicating
 * that logic here would be a second place to keep in sync with the real
 * write path for no benefit.
 *
 * **Correction, 2026-07-31 (content lifecycle state machine).** `createWork`/
 * `createPost` now always create a `DRAFT` (Prisma's own schema default —
 * see admin-work.ts/admin-posts.ts's comments), and the PUBLIC
 * `getAllWork()`/`getJournalEntries()` — the exact functions
 * `generate-pages-manifest.ts` calls to build the page list this suite's
 * fixtures are checked against — now filter to `lifecycleState: "PUBLISHED"`
 * only. Without an explicit `publishWork()`/`publishPost()` call right
 * after creating each fixture (added below), every single fixture silently
 * stopped existing from the public site's point of view the moment that
 * filter shipped — not found by re-reading this file, but live, from
 * `visual.spec.ts` failing in CI with "visual-fixtures.manifest.ts
 * references '/work/navigation-engine', but it no longer exists in
 * pages.manifest.ts." Left this paragraph as a correction, not a silent
 * fix, per this repo's own rule about keeping a wrong first assumption in
 * the record.
 *
 * Deliberately covers BOTH branches of the two filters
 * `generate-pages-manifest.ts` applies (`hasCaseStudy`/"has a real body") —
 * one work item and one post with a case study/body, one of each WITHOUT —
 * so those filters are actually exercised by a real, changing dataset
 * instead of happening to always take the same branch.
 */

const FIXTURES = {
    work: {
        /**
         * The one item with a full case study: hero image + an `approachList`
         * block (mirrors the real site's "navigation-engine" case study shape
         * — heroImage + approach steps grid — which `visual-fixtures.manifest.ts`
         * has pointed at for this exact template variant since the original
         * `frontend/tests/` suite).
         */
        withCaseStudy: {
            slug: "navigation-engine",
            title: "Navigation Engine (E2E fixture)",
            year: 2025,
            status: "shipped" as const,
            summary: "A fixture case study covering the hero-image + approach-steps-grid template variant.",
            stack: ["Kotlin", "Jetpack Compose"],
            coverImage: null,
            featured: true,
            relatedPostSlug: "flowbus",
            caseStudy: {
                startedLabel: "Jan 2025",
                shippedLabel: "Jun 2025",
                role: "Lead engineer",
                heroImage: null,
                blocks: [
                    { type: "lead" as const, text: "How a deterministic navigation engine replaced an ad-hoc routing layer." },
                    { type: "paragraph" as const, text: "This is fixture content for the E2E visual/accessibility suite, not a real case study." },
                    {
                        type: "approachList" as const,
                        data: {
                            items: [
                                { title: "Diagnose", description: "Mapped every existing navigation edge case before writing a line of the replacement." },
                                { title: "Design", description: "Modeled the navigation graph as an explicit, testable state machine." },
                                { title: "Ship", description: "Rolled out behind a flag, then removed the old routing layer entirely." },
                            ],
                        },
                    },
                ],
            },
        },
        /**
         * A second case study, WITHOUT a hero image — covers the template's
         * other real variant (see visual-fixtures.manifest.ts's own comment on
         * "a case study with no heroImage" being a worthwhile future addition).
         * Also the only `featured: false` item, so `work-list`'s "not featured"
         * rendering path isn't accidentally untested.
         */
        secondCaseStudy: {
            slug: "onboarding-flow",
            title: "Onboarding Flow Redesign (E2E fixture)",
            year: 2024,
            status: "shipped" as const,
            summary: "A fixture case study covering the no-hero-image template variant.",
            stack: ["TypeScript", "React"],
            coverImage: null,
            featured: false,
            relatedPostSlug: null,
            caseStudy: {
                startedLabel: "Mar 2024",
                shippedLabel: "May 2024",
                role: "Contributor",
                heroImage: null,
                blocks: [
                    { type: "lead" as const, text: "Fixture content — a simple case study with no hero image and no approach grid." },
                    { type: "paragraph" as const, text: "Covers the plain paragraph-only rendering path of the case-study template." },
                ],
            },
        },
        /**
         * No case study at all — exercises `hasCaseStudy: false`, the branch
         * `generate-pages-manifest.ts` filters OUT of both manifests (mirrors
         * the real site's small internal tools that never got a write-up).
         */
        withoutCaseStudy: {
            slug: "internal-tooling",
            title: "Internal Tooling (E2E fixture)",
            year: 2023,
            status: "in-progress" as const,
            summary: "A fixture work item with no case study — exercises the hasCaseStudy: false filter.",
            stack: ["Python"],
            coverImage: null,
            featured: false,
            relatedPostSlug: null,
            caseStudy: null,
        },
    },
    posts: {
        /** Published, WITH a body that includes a `code` block (mirrors the real "flowbus" post's template variant). */
        withBody: {
            slug: "flowbus",
            title: "Notes on Flowbus (E2E fixture)",
            category: "Architecture",
            excerpt: "A fixture post covering the code-block template variant.",
            status: "published" as const,
            relatedWorkSlug: "navigation-engine",
            blocks: [
                { type: "lead" as const, text: "Fixture content for the E2E visual/accessibility suite, not a real post." },
                { type: "paragraph" as const, text: "This post exists to exercise the template's code-block rendering path." },
                {
                    type: "code" as const,
                    data: { filename: "example.ts", language: "typescript", code: "export function example(): number {\n    return 42;\n}\n" },
                },
            ],
        },
        /** A second published post, plain body (no code block) — covers the template's more common, simpler shape. */
        secondPost: {
            slug: "testing-culture",
            title: "Building a Testing Culture (E2E fixture)",
            category: "Process",
            excerpt: "A fixture post covering the plain-body template variant.",
            status: "published" as const,
            relatedWorkSlug: null,
            blocks: [
                { type: "lead" as const, text: "Fixture content — a plain post body with no code block." },
                { type: "paragraph" as const, text: "Covers the paragraph/quote-only rendering path of the post template." },
                { type: "quote" as const, text: "Fixture quote block.", data: { attribution: "E2E fixture" } },
            ],
        },
        /**
         * "Upcoming" stub, NO body at all — exercises the "no real body"
         * branch `generate-pages-manifest.ts` filters OUT (mirrors the real
         * site's de-emphasized "upcoming" journal entries, see
         * `web/src/views/journal-list/README.md`'s dated entries on that UX).
         */
        withoutBody: {
            slug: "upcoming-draft",
            title: "Upcoming (E2E fixture)",
            category: "Process",
            excerpt: "A fixture upcoming stub with no body — exercises the no-real-body filter.",
            status: "upcoming" as const,
            relatedWorkSlug: null,
            blocks: [],
        },
    },
};

/**
 * Russian versions for exactly ONE post and ONE work item, on purpose.
 *
 * Until these existed, every fixture title in this file was English, so the
 * entire Russian branch — `availableLocales`, hreflang, and the canonical
 * of an UNTRANSLATED Russian page pointing back at the English URL — had no
 * e2e coverage at all: with everything translated (or nothing), whichever
 * of the two canonical rules is wrong would still look right. Leaving
 * `testing-culture` and `onboarding-flow` untranslated is what makes both
 * branches live at once.
 *
 * The Cyrillic here is also what `og-image.spec.ts` needs: a broken font
 * subset renders as "tofu" only when there are non-Latin glyphs to draw.
 */
/** The address `testing-culture` briefly lived at during seeding, purely so a redirect exists to test. */
const RENAMED_FROM = { post: "testing-culture-draft" };

const TRANSLATIONS = {
    posts: {
        flowbus: {
            title: "Заметки о Flowbus (E2E-фикстура)",
            category: "Архитектура",
            excerpt: "Фикстурный пост, покрывающий вариант шаблона с блоком кода.",
            blocks: [
                { type: "lead" as const, text: "Фикстурный контент для e2e-набора, а не настоящий пост." },
                { type: "paragraph" as const, text: "Этот пост существует, чтобы проверить отрисовку блока кода." },
            ],
        },
    },
    work: {
        "navigation-engine": {
            summary: "Фикстурный кейс: hero-изображение и сетка шагов подхода.",
            startedLabel: "Янв 2025",
            shippedLabel: "Июн 2025",
            role: "Ведущий инженер",
            blocks: [
                { type: "lead" as const, text: "Как детерминированный движок навигации заменил стихийный роутинг." },
                { type: "paragraph" as const, text: "Фикстурный контент для e2e-набора, а не настоящий кейс." },
            ],
        },
    },
};

async function main(): Promise<void> {
    await resetTestDatabase();

    // Each FIXTURES.* entry's shape already matches WorkInput/PostInput
    // field-for-field (see admin-work.ts/admin-posts.ts), so it's passed
    // straight through rather than re-destructured — the fixture data IS
    // the input, there's no separate "test data" shape to translate from.
    //
    // `publishWork`/`publishPost` right after create — every fixture here
    // is meant to be publicly visible (that's the whole point of a fixture
    // the visual/a11y suite navigates to as a real visitor), but
    // `createWork`/`createPost` alone only ever produce a DRAFT (see this
    // file's top comment's 2026-07-31 correction). All three work items and
    // all three posts satisfy the strict publish contract as written above
    // (every required field is filled in) — if a future edit to `FIXTURES`
    // ever doesn't, `publishWork`/`publishPost` throws immediately here,
    // failing this seed script loudly instead of silently seeding
    // unpublishable content.
    for (const work of Object.values(FIXTURES.work)) {
        await createWork(work);
        await publishWork(work.slug);
    }
    for (const post of Object.values(FIXTURES.posts)) {
        await createPost(post);
        await publishPost(post.slug);
    }

    // Creates a slug-history row WITHOUT changing the final fixture set:
    // the post ends up at `testing-culture` either way, but
    // `/journal/testing-culture-draft` now has to answer with a permanent
    // redirect. `seo.spec.ts` asserts that, which is the only way to prove
    // end-to-end that a rename doesn't throw away the old address (see
    // backend/src/content/slug-history.ts).
    //
    // **Correction, 2026-08-09 (draft/publish split).** A slug rename now
    // only reaches the live row — and therefore `SlugHistory` — through
    // `publishPost`, never through a draft save alone (`savePostDraft`,
    // the direct successor of what used to be `updatePost`'s content-write
    // half — see content/README.md's dated entry). So each rename below is
    // a `savePostDraft` (stages the new slug) followed immediately by a
    // `publishPost` (actually applies it) — the SAME two-step dance the
    // real admin editor's Publish/Update button performs, not a shortcut
    // this script invented for itself.
    await savePostDraft(FIXTURES.posts.secondPost.slug, {
        ...FIXTURES.posts.secondPost,
        slug: RENAMED_FROM.post,
    });
    await publishPost(FIXTURES.posts.secondPost.slug);
    await savePostDraft(RENAMED_FROM.post, FIXTURES.posts.secondPost);
    await publishPost(RENAMED_FROM.post);

    // Same correction as the rename above: `translatePost`/`translateWork`
    // only stage the Russian side in a draft now (see admin-posts.ts's
    // `translatePost`) — without the `publishPost`/`publishWork` call
    // right after, the translation would never actually reach the live
    // row, and every e2e assertion that depends on a REAL Russian page
    // existing (hreflang in `seo.spec.ts`, Cyrillic glyphs in
    // `og-image.spec.ts`) would silently stop having anything to find.
    for (const [slug, translation] of Object.entries(TRANSLATIONS.posts)) {
        await translatePost(slug, translation);
        await publishPost(slug);
    }
    for (const [slug, translation] of Object.entries(TRANSLATIONS.work)) {
        await translateWork(slug, translation);
        await publishWork(slug);
    }

    console.log(
        "Seeded e2e fixtures: 3 work items (2 with a case study, 1 without), 3 posts (2 with a body, 1 without), " +
        `1 post and 1 work item translated into Russian, 1 slug-history entry (/journal/${ RENAMED_FROM.post }).`,
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
