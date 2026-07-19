import { prisma } from "../db/client";
import { parseBlocks, type Block, type BlockInput } from "./blocks";

/**
 * Fetches and validates every block of a document, in order. The one place
 * that queries the `Block` table — reused by both posts.ts (post body) and
 * work.ts (case-study narrative), since a post body and a case study are
 * both just "a document's blocks" (see this module's README).
 */
export async function getDocumentBlocks(documentId: string): Promise<Block[]> {
    const rows = await prisma.block.findMany({
        where: { documentId },
        orderBy: { order: "asc" },
    });

    return parseBlocks(rows);
}

/**
 * The admin editor always submits the WHOLE block list for a document, not
 * incremental add/remove/reorder operations — matching "самая простая
 * админка" (see the migration plan, Phase 4) rather than a per-block CRUD
 * API the editor would have to diff against. So saving is always "wipe
 * this document's blocks, insert what was submitted, in the order
 * submitted" — `order` comes from array position, never from the client.
 *
 * Also owns the create/delete side of the `Document` row itself, not just
 * its blocks — a `Post`/`Work` with zero blocks has no reason to keep an
 * empty `Document` row around (mirrors "an upcoming stub post has no body
 * document at all", generalized to "empty body ⇒ no document, regardless
 * of status"). Returns the id the caller should store on `Post.bodyDocumentId`
 * / `Work.caseStudyDocumentId` — `null` when the content was cleared out.
 */
export async function replaceDocumentContent(documentId: string | null, blocks: BlockInput[]): Promise<string | null> {
    if (blocks.length === 0) {
        if (documentId) {
            await prisma.document.delete({ where: { id: documentId } }); // cascades to Block rows
        }
        return null;
    }

    const targetId = documentId ?? (await prisma.document.create({ data: {} })).id;

    await prisma.$transaction([
        prisma.block.deleteMany({ where: { documentId: targetId } }),
        prisma.block.createMany({
            // `"text"/"data" in block` narrows per-iteration (inlined, not
            // extracted into a helper — a helper's declared return type
            // would erase this narrowing and stop matching what Prisma's
            // Json columns accept; see import-legacy-content.ts, which
            // hit this same shape first). `?? undefined`: an explicit
            // `null` (e.g. an `image` block with no caption — its `text`
            // is `.nullish()`) isn't assignable to Prisma's nullable-Json
            // input type directly (it wants the `Prisma.JsonNull` sentinel
            // for that); omitting the field entirely on a fresh `create`
            // reaches the exact same NULL column either way, no sentinel
            // needed.
            data: blocks.map((block, index) => ({
                documentId: targetId,
                order: index,
                type: block.type,
                text: ("text" in block ? block.text : undefined) ?? undefined,
                data: ("data" in block ? block.data : undefined) ?? undefined,
            })),
        }),
    ]);

    return targetId;
}
