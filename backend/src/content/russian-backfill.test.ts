import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db/client";
import { resetTestDatabase } from "../test-utils/db";
import { parseBlockInputs } from "./blocks";
import { replaceDocumentContent } from "./document";
import { getPostBySlug } from "./posts";
import { getWorkBySlug } from "./work";
import { translatePostInputSchema } from "./admin-posts";
import { translateWorkInputSchema } from "./admin-work";

const root = path.resolve(import.meta.dirname, "../..");
const directory = path.join(root, "content-translations/ru");
const packs = readdirSync(directory).filter((name) => name.endsWith(".json")).sort().map((name) => JSON.parse(readFileSync(path.join(directory, name), "utf8")));
const migration = readFileSync(path.join(root, "prisma/migrations/20261112000000_backfill_russian_content/migration.sql"), "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const runMigration = () => pool.query(migration);

async function seed(pack: typeof packs[number]) {
    const documentId = await replaceDocumentContent(null, parseBlockInputs(pack.source.blocks));
    const localized = Object.fromEntries(Object.entries(pack.source).filter(([key]) => key !== "blocks").map(([key, value]) => [key, { en: value, ru: "" }]));
    if (pack.kind === "post") {
        return prisma.post.create({ data: { slug: pack.slug, date: "2026-11-01", readMins: 1, status: "published", lifecycleState: "PUBLISHED", publishedAt: new Date("2026-11-01"), bodyDocumentId: documentId, title: localized.title, category: localized.category, excerpt: localized.excerpt } });
    }
    return prisma.work.create({ data: { slug: pack.slug, date: "2026-11-01", status: "shipped", lifecycleState: "PUBLISHED", publishedAt: new Date("2026-11-01"), caseStudyDocumentId: documentId, stack: [], title: localized.title, summary: localized.summary, role: localized.role, startedLabel: localized.startedLabel, shippedLabel: localized.shippedLabel } });
}

beforeEach(resetTestDatabase);
afterAll(() => pool.end());

describe("Russian content migration", () => {
    it("publishes all twelve complete translations without changing English content and is safe to retry", async () => {
        expect(packs).toHaveLength(12);
        for (const pack of packs) {
            (pack.kind === "post" ? translatePostInputSchema : translateWorkInputSchema).parse(pack.translation);
            await seed(pack);
        }
        const englishBefore = await prisma.block.findMany({ orderBy: { id: "asc" } });
        await runMigration();
        for (const pack of packs) {
            const detail = pack.kind === "post" ? await getPostBySlug(pack.slug, "ru") : await getWorkBySlug(pack.slug, "ru");
            expect(detail?.availableLocales, pack.slug).toEqual(["en", "ru"]);
            expect(detail?.title.ru).toBe(pack.translation.title);
            const translated = detail && ("body" in detail ? detail.body : detail.caseStudy?.blocks);
            expect(translated?.map(({ id, order, ...block }) => block)).toEqual(parseBlockInputs(pack.translation.blocks));
        }
        for (const block of englishBefore) expect(await prisma.block.findUnique({ where: { id: block.id } })).toEqual(block);
        const counts = [await prisma.document.count(), await prisma.block.count()];
        await runMigration();
        expect([await prisma.document.count(), await prisma.block.count()]).toEqual(counts);
    });

    it("leaves a changed English source untouched", async () => {
        const pack = packs.find((entry) => entry.kind === "post")!;
        await seed(pack);
        await prisma.post.update({ where: { slug: pack.slug }, data: { title: { en: "Edited since capture", ru: "" } } });
        await runMigration();
        expect((await getPostBySlug(pack.slug, "ru"))?.availableLocales).toEqual(["en"]);
        expect(await prisma.document.count()).toBe(1);
    });

    it("preserves existing Russian translations and unpublished drafts", async () => {
        const [first, second] = packs.filter((entry) => entry.kind === "post");
        const row = await seed(first);
        await seed(second);
        const ruDocument = await replaceDocumentContent(null, [{ type: "paragraph", text: "Авторский перевод" }]);
        await prisma.post.update({ where: { id: row.id }, data: { bodyDocumentIdRu: ruDocument, title: { en: first.source.title, ru: "Авторский заголовок" } } });
        const other = await prisma.post.findUniqueOrThrow({ where: { slug: second.slug } });
        await prisma.contentDraft.create({ data: { kind: "post", entityId: other.id, data: { pending: true } } });
        const before = await prisma.post.findMany({ orderBy: { slug: "asc" } });
        await runMigration();
        expect(await prisma.post.findMany({ orderBy: { slug: "asc" } })).toEqual(before);
        expect(await prisma.document.count()).toBe(3);
    });
});
