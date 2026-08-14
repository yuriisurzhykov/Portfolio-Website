import { blockSchema, type Block, type BlockInput } from "./blocks";

/**
 * Turns draft/revision blocks (`BlockInput[]` — no `id`/`order`, see
 * `blocks.ts`'s top comment) into the `Block[]` shape every reader
 * (`<BlockEditor initialBlocks>`, the public `PostDetail`/`WorkDetail.body`)
 * actually expects. `id`/`order` are synthesized from array position —
 * fine here because these ids are never persisted or referenced by
 * anything else (unlike a real `Block` row's own database id): a draft
 * has no `Block` rows at all until `replaceDocumentContent` writes them at
 * publish time, so there is no "real" id to preserve.
 *
 * Parsed through `blockSchema`, not just spread + cast — every `BlockInput`
 * already satisfies its own core shape, so adding `id`/`order` is the ONLY
 * thing missing to also satisfy `blockSchema`; running it through Zod
 * (instead of an `as Block` cast) means a future block type that's
 * missing a required core field fails loudly here rather than silently
 * producing a `Block` that lies about its own shape.
 */
export function toDisplayBlocks(blocks: BlockInput[]): Block[] {
    return blocks.map((block, order) => blockSchema.parse({ ...block, id: `draft-${ order }`, order }));
}
