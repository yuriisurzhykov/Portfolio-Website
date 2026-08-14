import "dotenv/config";
import { prisma } from "../src/db/client";
import { localizedTextSchema } from "../src/content/localized-text";
import { ensureWorkCoverIsCurrent } from "../src/media/work-covers";

/**
 * Work's half of `backfill-post-covers.ts` — same reasoning, same
 * "safe to re-run, no-op when nothing changed" guarantee (see that
 * script's own comment for the full explanation). `createWork` only
 * auto-generates a cover for Work items created AFTER 2026-08-11 (Work
 * Item Covers & Unified Identity Hue); every item already in the database
 * at that point has `coverAssetId: null`, and nothing else ever revisits
 * it (`publishWork` on an already-published item with no pending draft is
 * a deliberate no-op, same as `publishPost` — see `admin-work.ts`'s own
 * comment — so a plain "Update" click does NOT trigger this).
 *
 * Covers EVERY Work item regardless of lifecycle state (DRAFT and
 * PUBLISHED alike), same reasoning as the Post script.
 */
async function main() {
    const items = await prisma.work.findMany({ orderBy: { createdAt: "asc" } });
    console.log(`Found ${ items.length } work item(s).`);

    let updated = 0;
    let unchanged = 0;

    for (const item of items) {
        const title = localizedTextSchema.parse(item.title).en;
        const summary = localizedTextSchema.parse(item.summary).en;

        const coverAssetId = await ensureWorkCoverIsCurrent(item.coverAssetId, {
            slug: item.slug,
            titleEn: title,
            summaryEn: summary,
            date: item.date,
        });

        if (coverAssetId === item.coverAssetId) {
            console.log(`${ item.slug }: already up to date, skipped`);
            unchanged++;
            continue;
        }

        await prisma.work.update({ where: { slug: item.slug }, data: { coverAssetId } });
        console.log(`${ item.slug }: cover ${ item.coverAssetId ? "corrected" : "generated" }`);
        updated++;
    }

    console.log(`\nDone. ${ updated } work item(s) updated, ${ unchanged } already up to date.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
