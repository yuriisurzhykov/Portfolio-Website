import "dotenv/config";
import { prisma } from "../src/db/client";
import { SITE_CONTENT_KEYS } from "../src/content/site-content";
import { SITE_CONTENT_DEFAULTS } from "../src/content/site-content-defaults";

/**
 * One-off/idempotent seed for the Phase 5 `SiteContent` rows — run once
 * against a fresh database (and safe to re-run: an existing row is left
 * untouched entirely, not just "updated with the same values" — Prisma's
 * `@updatedAt` would otherwise bump `updatedAt` on every re-run even for a
 * no-op write, making that column lie about when the admin last actually
 * edited the section). `getSiteContent()` (`content/site-content.ts`)
 * already falls back to the same `SITE_CONTENT_DEFAULTS` object for a
 * missing row, so the public site works correctly even before this script
 * ever runs — this script exists so the admin's `/admin/settings/[key]`
 * forms have a real row to load/edit from day one, not so the site
 * depends on it.
 */
async function main() {
    for (const key of SITE_CONTENT_KEYS) {
        const existing = await prisma.siteContent.findUnique({ where: { key } });
        if (existing) {
            console.log(`${ key }: already seeded, skipped`);
            continue;
        }
        await prisma.siteContent.create({ data: { key, data: SITE_CONTENT_DEFAULTS[key] } });
        console.log(`${ key }: seeded`);
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
