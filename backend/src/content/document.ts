import { prisma } from "../db/client";
import { parseBlocks, type Block } from "./blocks";

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
