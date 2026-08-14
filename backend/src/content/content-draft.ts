import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import type { ContentKind } from "./slug-history";

/**
 * The generic storage layer behind "draft vs. published" (see
 * backend/src/content/README.md's dated entry for the bug this fixes and
 * the overall design). `admin-posts.ts`/`admin-work.ts` own the actual
 * `PostDraftData`/`WorkDraftData` shapes and all the domain logic (what a
 * draft merges onto, what publishing validates) — this module only knows
 * "a draft/revision is some JSON blob keyed by (kind, entityId)," the same
 * division of responsibility `slug-history.ts` already draws for renames.
 *
 * `data` is `unknown` on every read — same reasoning as `Block.text`/
 * `Block.data`: an untyped `Json` column, validated at the call site by
 * whichever Zod schema (`postDraftDataSchema`/`workDraftDataSchema`) knows
 * what it's supposed to contain.
 */

/** `null` when there's no pending draft for this entity — the caller falls back to materializing one from the live row (see `admin-posts.ts`'s `materializeDraft`). */
export async function readDraft(kind: ContentKind, entityId: string): Promise<unknown | null> {
    const row = await prisma.contentDraft.findUnique({ where: { kind_entityId: { kind, entityId } } });
    return row?.data ?? null;
}

/** One row per entity — a second save for the same `(kind, entityId)` overwrites the pending draft rather than stacking up a history of edits (see schema.prisma's comment on `ContentDraft`'s `@@unique`). */
export async function saveDraft(kind: ContentKind, entityId: string, data: unknown): Promise<void> {
    const json = data as Prisma.InputJsonValue;
    await prisma.contentDraft.upsert({
        where: { kind_entityId: { kind, entityId } },
        create: { kind, entityId, data: json },
        update: { data: json },
    });
}

/** No-op if there was no draft — `discardDraft`/publish both call this unconditionally rather than checking existence first. */
export async function discardDraft(kind: ContentKind, entityId: string): Promise<void> {
    await prisma.contentDraft.deleteMany({ where: { kind, entityId } });
}

/**
 * How many past PUBLISHED snapshots to keep per entity — version history
 * for "I broke something, let me go back a step or two," not a permanent
 * audit log (see schema.prisma's comment on `ContentRevision`). Kept as a
 * named constant rather than inlined so the number has exactly one place
 * to change, and `content-draft.test.ts` can assert the actual pruning
 * behavior against it instead of a magic literal.
 */
export const MAX_REVISIONS = 20;

/**
 * Records `data` (the content that was JUST overwritten) as a restorable
 * snapshot, then prunes anything past `MAX_REVISIONS` for this entity —
 * oldest first. Called by `publishPost`/`publishWork` ONLY when the entity
 * was already PUBLISHED before this call (see their own comments): there
 * is nothing worth preserving from a post that was never live.
 */
export async function snapshotRevision(kind: ContentKind, entityId: string, data: unknown, publishedAt: Date): Promise<void> {
    await prisma.contentRevision.create({ data: { kind, entityId, data: data as Prisma.InputJsonValue, publishedAt } });

    const stale = await prisma.contentRevision.findMany({
        where: { kind, entityId },
        orderBy: { createdAt: "desc" },
        skip: MAX_REVISIONS,
        select: { id: true },
    });
    if (stale.length > 0) {
        await prisma.contentRevision.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
    }
}

export interface RevisionSummary {
    id: string;
    publishedAt: string;
}

/** Newest first — what the admin's "History" screen lists (`listRevisions`, not the raw rows) alongside a "Load into draft" action per entry. */
export async function listRevisions(kind: ContentKind, entityId: string): Promise<RevisionSummary[]> {
    const rows = await prisma.contentRevision.findMany({
        where: { kind, entityId },
        orderBy: { createdAt: "desc" },
        select: { id: true, publishedAt: true },
    });
    return rows.map((row) => ({ id: row.id, publishedAt: row.publishedAt.toISOString() }));
}

/** `null` if `revisionId` doesn't exist OR belongs to a different entity — the `kind`/`entityId` filter is what stops one post's history screen from restoring a revision that's actually someone else's. */
export async function getRevisionData(kind: ContentKind, entityId: string, revisionId: string): Promise<unknown | null> {
    const row = await prisma.contentRevision.findFirst({ where: { id: revisionId, kind, entityId } });
    return row?.data ?? null;
}

/**
 * "Load into draft" — copies a past revision's content into the entity's
 * CURRENT draft, overwriting whatever was pending. Deliberately never
 * writes the live row directly: a restored revision still has to go
 * through the normal Publish/Update button, same as any other edit, so
 * there's exactly one path onto the live site rather than a second,
 * rollback-shaped one. Returns the restored data so the caller can hand
 * it straight back to the admin editor without a second read.
 */
export async function restoreRevisionToDraft(kind: ContentKind, entityId: string, revisionId: string): Promise<unknown | null> {
    const data = await getRevisionData(kind, entityId, revisionId);
    if (data === null) {
        return null;
    }
    await saveDraft(kind, entityId, data);
    return data;
}

/** Deletes every draft/revision row for an entity — called by `deletePost`/`deleteWork`, same "no foreign key, so the caller must clean up explicitly" reasoning as `slug-history.ts`'s `forgetSlugHistory`. */
export async function discardAllDraftHistory(kind: ContentKind, entityId: string): Promise<void> {
    await prisma.contentDraft.deleteMany({ where: { kind, entityId } });
    await prisma.contentRevision.deleteMany({ where: { kind, entityId } });
}

/**
 * One query for every entity's draft at once — what `getPostsForAdmin`/
 * `getWorkForAdmin` use to show "Unpublished changes"/a draft-priority
 * title in a LIST without an N+1 lookup per row.
 */
export async function readDraftsFor(kind: ContentKind, entityIds: string[]): Promise<Map<string, unknown>> {
    if (entityIds.length === 0) {
        return new Map();
    }
    const rows = await prisma.contentDraft.findMany({ where: { kind, entityId: { in: entityIds } } });
    return new Map(rows.map((row) => [row.entityId, row.data]));
}
