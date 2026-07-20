/**
 * The set of languages a post body / case-study narrative can have its
 * own, independent `Document` for (`Post.bodyDocumentId`/`bodyDocumentIdRu`,
 * `Work.caseStudyDocumentId`/`caseStudyDocumentIdRu`). Deliberately its own
 * tiny file rather than living on `posts.ts`/`work.ts` — both need the
 * exact same type, and `web/src/shared/i18n/types.ts`'s `Language` is the
 * UI-side mirror of this (kept separate on purpose, same reasoning as
 * `LocalizedTextValue` in web's `LocalizedField.tsx`: the web package
 * shouldn't need to import backend's runtime just to share a type shape).
 */
export type ContentLocale = "en" | "ru";
