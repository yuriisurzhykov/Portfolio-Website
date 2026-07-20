import "dotenv/config";
import { prisma } from "../src/db/client";

/**
 * One-off data migration for the "перевод — отдельная страница" plan:
 * every `Document` in this database was created by `import-legacy-content.ts`
 * with each block's `text` (and `image.alt`/`approachList[].title`/
 * `approachList[].description`) stored as a `{en, ru}` pair — the OLD
 * shape. `blocks.ts` no longer accepts that shape at all (plain
 * `z.string()` now, see its top comment) — a post's/work item's body is
 * now ONE language's Document; a translation is a wholly separate
 * Document with its own `Post.bodyDocumentIdRu`/`Work.caseStudyDocumentIdRu`
 * pointer (schema.prisma).
 *
 * Run once (`npx tsx scripts/split-bilingual-documents.ts`) against a
 * database that still has old-shape content, AFTER the schema migration
 * that added `bodyDocumentIdRu`/`caseStudyDocumentIdRu` has already run.
 * Safe to re-run: `looksLikeOldShape` skips any Document whose blocks are
 * already plain strings (either because this script already split it, or
 * because it was authored fresh through the new admin editor and never
 * had a `{en, ru}` shape to begin with).
 */

type LocalizedRaw = { en: unknown; ru: unknown };

function isLocalizedRaw(value: unknown): value is LocalizedRaw {
    return typeof value === "object" && value !== null && "en" in value && "ru" in value;
}

function isNonEmptyString(value: unknown): boolean {
    return typeof value === "string" && value.trim().length > 0;
}

interface RawBlockRow {
    id: string;
    order: number;
    type: string;
    text: unknown;
    data: unknown;
}

/** Every nested spot a `{en, ru}` pair can appear in a block, per type — mirrors blocks.ts's per-type shapes, kept in sync with it by hand since this script is a one-off, not a long-lived consumer of blocks.ts's schemas. */
function blockHasOldShape(block: RawBlockRow): boolean {
    if (isLocalizedRaw(block.text)) return true;
    const data = block.data as Record<string, unknown> | null;
    if (!data) return false;
    if (block.type === "image" && isLocalizedRaw(data.alt)) return true;
    if (block.type === "approachList" && Array.isArray(data.items)) {
        return (data.items as Record<string, unknown>[]).some(
            (item) => isLocalizedRaw(item.title) || isLocalizedRaw(item.description),
        );
    }
    return false;
}

function blockHasNonEmptyRu(block: RawBlockRow): boolean {
    if (isLocalizedRaw(block.text) && isNonEmptyString(block.text.ru)) return true;
    const data = block.data as Record<string, unknown> | null;
    if (!data) return false;
    if (block.type === "image" && isLocalizedRaw(data.alt) && isNonEmptyString(data.alt.ru)) return true;
    if (block.type === "approachList" && Array.isArray(data.items)) {
        return (data.items as Record<string, unknown>[]).some((item) => {
            const title = item.title;
            const description = item.description;
            return (isLocalizedRaw(title) && isNonEmptyString(title.ru))
                || (isLocalizedRaw(description) && isNonEmptyString(description.ru));
        });
    }
    return false;
}

function pickLocale(value: unknown, locale: "en" | "ru"): unknown {
    return isLocalizedRaw(value) ? value[locale] : value;
}

function splitBlockData(type: string, data: unknown, locale: "en" | "ru"): unknown {
    if (data === null || data === undefined) return data;
    const record = data as Record<string, unknown>;
    if (type === "image") {
        return {...record, alt: pickLocale(record.alt, locale)};
    }
    if (type === "approachList" && Array.isArray(record.items)) {
        return {
            ...record,
            items: (record.items as Record<string, unknown>[]).map((item) => ({
                title: pickLocale(item.title, locale),
                description: pickLocale(item.description, locale),
            })),
        };
    }
    return data;
}

async function createSplitDocument(blocks: RawBlockRow[], locale: "en" | "ru"): Promise<string> {
    const document = await prisma.document.create({data: {}});
    await prisma.block.createMany({
        data: blocks.map((block) => ({
            documentId: document.id,
            order: block.order,
            type: block.type,
            text: pickLocale(block.text, locale) ?? undefined,
            data: splitBlockData(block.type, block.data, locale) ?? undefined,
        })),
    });
    return document.id;
}

/** Returns `null` (no-op) when the Document is already in the new, plain-string shape. */
async function splitDocument(documentId: string): Promise<{ enId: string; ruId: string | null } | null> {
    const blocks = await prisma.block.findMany({where: {documentId}, orderBy: {order: "asc"}});

    if (!blocks.some(blockHasOldShape)) {
        return null;
    }

    const enId = await createSplitDocument(blocks, "en");
    const ruId = blocks.some(blockHasNonEmptyRu) ? await createSplitDocument(blocks, "ru") : null;

    await prisma.document.delete({where: {id: documentId}}); // cascades the old, mixed-shape Block rows
    return {enId, ruId};
}

async function migratePosts() {
    const posts = await prisma.post.findMany({where: {bodyDocumentId: {not: null}}});
    for (const post of posts) {
        const result = await splitDocument(post.bodyDocumentId!);
        if (!result) {
            console.log(`  skip (already split): post/${ post.slug }`);
            continue;
        }
        await prisma.post.update({
            where: {id: post.id},
            data: {bodyDocumentId: result.enId, bodyDocumentIdRu: result.ruId},
        });
        console.log(`  split: post/${ post.slug } -> en=${ result.enId } ru=${ result.ruId ?? "(none)" }`);
    }
}

async function migrateWork() {
    const items = await prisma.work.findMany({where: {caseStudyDocumentId: {not: null}}});
    for (const item of items) {
        const result = await splitDocument(item.caseStudyDocumentId!);
        if (!result) {
            console.log(`  skip (already split): work/${ item.slug }`);
            continue;
        }
        await prisma.work.update({
            where: {id: item.id},
            data: {caseStudyDocumentId: result.enId, caseStudyDocumentIdRu: result.ruId},
        });
        console.log(`  split: work/${ item.slug } -> en=${ result.enId } ru=${ result.ruId ?? "(none)" }`);
    }
}

async function main() {
    console.log("Splitting journal post bodies...");
    await migratePosts();
    console.log("Splitting work case studies...");
    await migrateWork();
    console.log("Done.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
