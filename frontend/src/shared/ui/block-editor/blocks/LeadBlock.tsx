import { createReactBlockSpec } from "@blocknote/react";

/**
 * The post/case-study opening line — larger, secondary-toned text with a
 * rule underneath (see `<ContentBlocks>`'s "lead" case for the exact same
 * visual treatment on the public site). No props at all: unlike `note`
 * (a variant to pick) or `image`/`code` (structured fields), a lead block
 * is just styled inline text — `content: "inline"` is the entire block,
 * which is why `contentRef` is all this render function needs.
 */
export const LeadBlock = createReactBlockSpec(
    { type: "lead", propSchema: {}, content: "inline" },
    {
        render: (props) => (
            <div className="w-full">
                <p
                    ref={props.contentRef}
                    className="text-[1.125em] text-text-secondary leading-relaxed m-0"
                />
                <hr className="border-t border-border-subtle mt-sm mb-0" />
            </div>
        ),
    },
);
