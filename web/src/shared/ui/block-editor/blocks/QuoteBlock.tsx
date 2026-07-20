import { createReactBlockSpec } from "@blocknote/react";
import { Input } from "@/shared/ui/form";

/**
 * Custom, not BlockNote's built-in `quote` — the built-in has no
 * `attribution` prop (only `backgroundColor`/`textColor`), and the site's
 * quote block always has an optional "who said it" line under the text
 * (see `<ContentBlocks>`'s "quote" case). Sharing the type name `"quote"`
 * with BlockNote's built-in isn't a collision — this schema (`../schema.ts`)
 * only registers ONE `quote` block spec (this one), so BlockNote's own
 * default slash-menu item generator still recognizes `type: "quote"` and
 * produces a normal "Quote" entry for it.
 */
export const QuoteBlock = createReactBlockSpec(
    {
        type: "quote",
        propSchema: { attribution: { default: "" } },
        content: "inline",
    },
    {
        render: (props) => (
            <div className="w-full border-l-2 border-border-default pl-md">
                <div
                    ref={props.contentRef}
                    className="italic text-text-secondary"
                />
                <Input
                    value={props.block.props.attribution}
                    onChange={(e) => props.editor.updateBlock(props.block, { props: { attribution: e.target.value } })}
                    placeholder="Attribution (optional) — who said it"
                    className="mt-xs h-8 text-caption not-italic"
                />
            </div>
        ),
    },
);
