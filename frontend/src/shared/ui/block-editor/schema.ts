import { BlockNoteSchema, createHeadingBlockSpec, defaultBlockSpecs } from "@blocknote/core";
import { LeadBlock } from "./blocks/LeadBlock";
import { QuoteBlock } from "./blocks/QuoteBlock";
import { NoteBlock } from "./blocks/NoteBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { CodeBlock } from "./blocks/CodeBlock";
import { ApproachListBlock } from "./blocks/ApproachListBlock";

/**
 * The editor's block schema — deliberately curated with `BlockNoteSchema.create({ blockSpecs: {...} })`
 * (a fixed list), NOT `BlockNoteSchema.create().extend({...})` (defaults +
 * additions). The site only ever renders the 8 block types
 * `backend/src/content/blocks.ts` knows about (see `<ContentBlocks>`) —
 * pulling in BlockNote's full default set (bullet/numbered/check lists,
 * tables, video, audio, file, its own `codeBlock`) would let an editor
 * create content the public site's renderer has no case for at all.
 *
 * Only `paragraph` and `heading` are the actual BlockNote defaults
 * (`heading` reconfigured to the two levels the site supports, H2/H3 —
 * `Text` doesn't have a visual "H1" on a post/case-study body, that's the
 * page's own `<h1>`). Every other type — `quote` (needs an `attribution`
 * prop BlockNote's built-in quote doesn't have), `note`, `image` (needs a
 * required `alt`, not just a `caption`), `code` (needs a `filename`
 * BlockNote's own `codeBlock` doesn't have), `approachList` (has no
 * BlockNote equivalent at all) — is a custom block (`./blocks/*`), each
 * mapping 1:1 onto one `BlockType` from `backend/src/content/blocks.ts`.
 *
 * `code` is registered here under the key `codeSnippet`, NOT `code` —
 * see `blocks/CodeBlock.tsx`'s top comment: `"code"` is already the name
 * of a default INLINE STYLE (the `` `code` `` mark), and ProseMirror
 * schemas reject a name that's both a node and a mark.
 * `convert.ts`/`slash-menu.tsx` still expose it to the rest of the app as
 * `"code"` — only this schema's internal registration needed the
 * different name.
 */
export const blockNoteSchema = BlockNoteSchema.create({
    blockSpecs: {
        paragraph: defaultBlockSpecs.paragraph,
        heading: createHeadingBlockSpec({ levels: [2, 3], defaultLevel: 2, allowToggleHeadings: false }),
        // `createReactBlockSpec` returns a FACTORY (`(options?) => BlockSpec`),
        // not the spec itself — every custom block here takes no options,
        // but still has to be called to produce the actual `BlockSpec`
        // `blockSpecs` expects.
        quote: QuoteBlock(),
        lead: LeadBlock(),
        note: NoteBlock(),
        image: ImageBlock(),
        codeSnippet: CodeBlock(),
        approachList: ApproachListBlock(),
    },
});

export type PortfolioBlockNoteEditor = typeof blockNoteSchema.BlockNoteEditor;
