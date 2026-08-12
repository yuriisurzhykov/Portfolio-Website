import "dotenv/config";
import { prisma } from "../src/db/client";
import { localizedTextSchema } from "../src/content/localized-text";
import { ensureCoverIsCurrent } from "../src/media/covers";

/**
 * One-off backfill for posts created BEFORE procedural covers existed —
 * `createPost` only auto-generates a cover for posts created AFTER that
 * feature shipped (see `backend/src/media/README.md`); every post already
 * in the database at that point has `coverAssetId: null` and nothing else
 * ever revisits it (`publishPost` is a deliberate no-op for an
 * already-published post with no pending draft — see its own comment in
 * `admin-posts.ts` — so simply clicking "Update" in the editor does NOT
 * trigger this; that no-op path never reaches `ensureCoverIsCurrent`
 * at all).
 *
 * Also the mechanism that upgrades every post to a NEW rendering algorithm
 * after a `CURRENT_COVER_STYLE_VERSION` bump (see `cover-brief.ts`) —
 * `ensureCoverIsCurrent` compares `styleVersion` too, not just category/
 * title/excerpt, so re-running this exact script after the v3 "Organic"
 * rewrite regenerates every v1 cover with no new script needed.
 *
 * Covers EVERY post regardless of lifecycle state (DRAFT and PUBLISHED
 * alike) — a draft deserves the same consistency an admin would expect
 * from `createPost`, even though only published ones are ever publicly
 * visible.
 *
 * Safe to re-run: `ensureCoverIsCurrent` is a no-op (one indexed read, no
 * rasterization, no write) for any post whose cover already matches its
 * current category/title/excerpt/styleVersion — see that function's own
 * comment. Running this twice in a row costs one cheap read per post the
 * second time, nothing more.
 */
async function main() {
    const posts = await prisma.post.findMany({ orderBy: { createdAt: "asc" } });
    console.log(`Found ${ posts.length } post(s).`);

    let updated = 0;
    let unchanged = 0;

    for (const post of posts) {
        const title = localizedTextSchema.parse(post.title).en;
        const category = localizedTextSchema.parse(post.category).en;
        const excerpt = localizedTextSchema.parse(post.excerpt).en;

        const coverAssetId = await ensureCoverIsCurrent(post.coverAssetId, {
            slug: post.slug,
            titleEn: title,
            excerptEn: excerpt,
            categoryEn: category,
            relatedWorkSlug: post.relatedWorkSlug,
            date: post.date,
        });

        if (coverAssetId === post.coverAssetId) {
            console.log(`${ post.slug }: already up to date, skipped`);
            unchanged++;
            continue;
        }

        await prisma.post.update({ where: { slug: post.slug }, data: { coverAssetId } });
        console.log(`${ post.slug }: cover ${ post.coverAssetId ? "corrected" : "generated" } (category "${ category }")`);
        updated++;
    }

    console.log(`\nDone. ${ updated } post(s) updated, ${ unchanged } already up to date.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
