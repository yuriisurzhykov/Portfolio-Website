import { z } from "zod";

/**
 * Single source of truth for "what a block looks like", shared by every
 * consumer: the import script (Phase 3), the content services below, the
 * future admin block editor (Phase 4), and web's <ContentBlocks> renderer.
 * Zod, not a plain TypeScript type, on purpose: `Block.text`/`Block.data`
 * are untyped `Json` columns in Postgres (see schema.prisma's comment on
 * why `type` isn't a DB enum) — anything read out of them is `unknown`
 * until validated. Zod gives one definition that's simultaneously the
 * runtime validator AND (via `z.infer`) the TypeScript type, instead of
 * maintaining a hand-written type and a hand-written validator that can
 * silently drift apart.
 */

const localizedText = z.object({ en: z.string(), ru: z.string() });

const baseFields = { id: z.string(), order: z.number().int() };

// `.nullish()`, not `.optional()`, for every field that's optional AND
// backed by a nullable `Json` column: Prisma reads back an unset Json
// column as `null`, never `undefined` — `.optional()` only accepts a
// missing/`undefined` key, so it rejects the very much real `null` Prisma
// hands back and the whole block fails to parse. Found by running the
// Phase 3 import + read-back against a real block that had no `data`
// (a plain heading) — not something a type-only review would have caught,
// since `unknown`-typed Json fields don't distinguish null from undefined
// at the type level either.
const leadBlock = z.object({ ...baseFields, type: z.literal("lead"), text: localizedText });
const headingBlock = z.object({
    ...baseFields,
    type: z.literal("heading"),
    text: localizedText,
    data: z.object({ level: z.union([z.literal(2), z.literal(3)]).optional() }).nullish(),
});
const paragraphBlock = z.object({ ...baseFields, type: z.literal("paragraph"), text: localizedText });
const quoteBlock = z.object({
    ...baseFields,
    type: z.literal("quote"),
    text: localizedText,
    data: z.object({ attribution: z.string().optional() }).nullish(),
});
const noteBlock = z.object({
    ...baseFields,
    type: z.literal("note"),
    text: localizedText,
    data: z.object({ variant: z.enum(["info", "warning", "tip"]) }),
});
const imageBlock = z.object({
    ...baseFields,
    type: z.literal("image"),
    text: localizedText.nullish(), // optional caption
    data: z.object({
        src: z.string(),
        alt: localizedText,
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
    }),
});
const codeBlock = z.object({
    ...baseFields,
    type: z.literal("code"),
    data: z.object({
        filename: z.string(),
        language: z.string().optional(),
        code: z.string(),
    }),
});
const approachListBlock = z.object({
    ...baseFields,
    type: z.literal("approachList"),
    data: z.object({
        items: z.array(z.object({ title: localizedText, description: localizedText })).min(1),
    }),
});

export const blockSchema = z.discriminatedUnion("type", [
    leadBlock,
    headingBlock,
    paragraphBlock,
    quoteBlock,
    noteBlock,
    imageBlock,
    codeBlock,
    approachListBlock,
]);

// Exported (not just used internally) — Post/Work fields (title, summary,
// excerpt, ...) are the exact same {en, ru} shape, and reusing this one
// schema for them too (see posts.ts/work.ts) avoids a second, easy-to-drift
// definition of "what a localized string looks like".
export const localizedTextSchema = localizedText;
export type LocalizedText = z.infer<typeof localizedText>;
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

/**
 * Shape of a raw row as it comes out of Prisma (`text`/`data` are
 * `JsonValue`, i.e. still `unknown` at the type level) — merges them with
 * `type` before validating, since the schema above expects `data`/`text`
 * to sit alongside `type` at the top level, not as separate arguments.
 */
export interface RawBlockRow {
    id: string;
    order: number;
    type: string;
    text: unknown;
    data: unknown;
}

export function parseBlock(row: RawBlockRow): Block {
    return blockSchema.parse({ id: row.id, order: row.order, type: row.type, text: row.text, data: row.data });
}

export function parseBlocks(rows: RawBlockRow[]): Block[] {
    return rows.map(parseBlock);
}
