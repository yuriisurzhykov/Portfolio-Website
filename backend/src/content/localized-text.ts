import { z } from "zod";

/**
 * Split out of `blocks.ts` — this shape now belongs ONLY to `Post`/`Work`
 * scalar metadata (`title`, `category`, `excerpt`, `summary`, `role`,
 * `startedLabel`, `shippedLabel`), never to a block's own text. A block's
 * body text is a plain `z.string()` now (see `blocks.ts`'s comment): a
 * translated post body is a separate `Document` (a separate row per
 * language, see `Post.bodyDocumentIdRu`/`Work.caseStudyDocumentIdRu` in
 * schema.prisma), not a `{en, ru}` pair on every single block — a
 * translator writes their own structure (different block count, different
 * order), which a paired-field block could never represent. Metadata
 * fields don't have that problem (one title, one category, always exactly
 * one string per language), so they keep the `{en, ru}` shape.
 *
 * `ru: ""` is a valid, real value here now — it means "not translated
 * yet," not "the translation is empty on purpose." The English version is
 * mandatory content; the admin "create post" flow (Phase 4/6) only ever
 * collects `en` and writes `ru: ""` for every metadata field, and
 * `pick()` (web/src/shared/i18n/I18nContext.tsx) falls back to English
 * for an empty string, not just for a missing key.
 */
export const localizedTextSchema = z.object({en: z.string(), ru: z.string()});
export type LocalizedText = z.infer<typeof localizedTextSchema>;
