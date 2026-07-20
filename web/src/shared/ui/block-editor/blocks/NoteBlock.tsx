import { createReactBlockSpec } from "@blocknote/react";
import { noteVariantClasses } from "@/shared/ui/content-blocks";
import { cn } from "@/shared/lib/utils";

type NoteVariant = "info" | "warning" | "tip";

/** Callout — same visual variants (`noteVariantClasses`, shared with `<ContentBlocks>`'s public renderer) as a small in-block toolbar for picking one, plus the note's own rich text underneath. */
export const NoteBlock = createReactBlockSpec(
    {
        type: "note",
        propSchema: { variant: { default: "info" as NoteVariant, values: ["info", "warning", "tip"] as const } },
        content: "inline",
    },
    {
        render: (props) => {
            const variant = props.block.props.variant;
            return (
                <div className={cn("w-full rounded-lg border p-md", noteVariantClasses[variant])}>
                    <div className="flex gap-2 mb-xs" contentEditable={false}>
                        {(["info", "warning", "tip"] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => props.editor.updateBlock(props.block, { props: { variant: option } })}
                                className={cn(
                                    "text-micro font-semibold uppercase tracking-wider px-xs py-[2px] rounded-sm",
                                    option === variant
                                        ? "bg-text-primary text-bg-app"
                                        : "text-text-muted hover:text-text-primary",
                                )}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    <div ref={props.contentRef} />
                </div>
            );
        },
    },
);
