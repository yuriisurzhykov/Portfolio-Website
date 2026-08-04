import { createReactBlockSpec } from "@blocknote/react";
import { Field, Input, Textarea } from "@/shared/ui/form";

/**
 * Custom, not BlockNote's own `codeBlock` — that one has no `filename`
 * prop (this site always shows one, e.g. "FlowBus.kt", per
 * `<ContentBlocks>`'s "code" case), and its CodeMirror-based content
 * editing doesn't map cleanly onto our plain-string `data.code` storage.
 * `content: "none"` — the code itself is a `props.code` string edited via
 * a plain `<Textarea>`, same UX as the previous `BlockFields.tsx`'s code
 * field, not BlockNote rich text (a code block's text was never meant to
 * carry bold/italic/links, so nothing is lost by not using inline content
 * here — `blocksToMarkdownLossy` never touches this block's `code` field
 * either, see `convert.ts`).
 *
 * BlockNote-internal type is `"codeSnippet"`, NOT `"code"` — `"code"` is
 * already taken by `defaultStyleSpecs`' inline "code" MARK (inline
 * `` `code` `` formatting), which this schema keeps (see `../schema.ts` —
 * only `blockSpecs` is customized, `styleSpecs` stays the BlockNote
 * default set). ProseMirror requires every name in a schema to be either
 * a node OR a mark, never both — registering a block also named "code"
 * throws `RangeError: code can not be both a node and a mark` at editor
 * construction (found live, not by inspection — this crashed the editor
 * outright on `/admin/journal/[slug]/edit` for any post with a code
 * block). `convert.ts` still maps this to/from the backend's `type:
 * "code"` — the storage format and this internal BlockNote type name
 * never had to be the same string, they just accidentally were at first.
 */
export const CodeBlock = createReactBlockSpec(
    {
        type: "codeSnippet",
        propSchema: {
            filename: { default: "" },
            language: { default: "" },
            code: { default: "" },
        },
        content: "none",
    },
    {
        render: (props) => {
            const { filename, language, code } = props.block.props;
            const update = (patch: Partial<{ filename: string; language: string; code: string }>) =>
                props.editor.updateBlock(props.block, { props: patch });

            return (
                <div className="w-full flex flex-col gap-sm p-sm rounded-md border border-border-subtle bg-surface-raised/50" contentEditable={false}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                        <Field label="Filename">
                            <Input value={filename} onChange={(e) => update({ filename: e.target.value })} placeholder="Example.kt" />
                        </Field>
                        <Field label="Language" hint="Optional — e.g. kotlin, ts, bash.">
                            <Input value={language} onChange={(e) => update({ language: e.target.value })} />
                        </Field>
                    </div>
                    <Field label="Code">
                        <Textarea
                            value={code}
                            onChange={(e) => update({ code: e.target.value })}
                            rows={8}
                            resizable
                            className="font-mono text-caption"
                        />
                    </Field>
                </div>
            );
        },
        /**
         * Without this, `toExternalHTML` falls back to `render` above (see
         * `@blocknote/react`'s `createReactBlockSpec`) — copying/dragging a
         * WHOLE selected code block (not just text inside its `<Textarea>`)
         * exported the edit-mode FORM markup itself (labels, `<input>`s) as
         * "the code", not the code. `<pre><code data-language>` is the exact
         * shape `htmlToMarkdown.ts`'s `serializeCodeBlock` looks for
         * (`data-language` attr, or a `language-*` class) to turn back into a
         * real ` ```lang ` fenced block — the same shape this editor's own
         * `paste-handler.ts` recognizes on the way back in, so copy-then-paste
         * (even into this same editor) round-trips as a real code block.
         */
        toExternalHTML: (props) => {
            const { language, code } = props.block.props;
            return (
                <pre>
                    <code data-language={language} className={language ? `language-${language}` : undefined}>
                        {code}
                    </code>
                </pre>
            );
        },
    },
);
