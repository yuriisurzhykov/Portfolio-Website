import { createReactBlockSpec } from "@blocknote/react";
import { Field, Input } from "@/shared/ui/form";

/**
 * `content: "none"` — an image block's actual content (`src`/`alt`/
 * `caption`) is entirely `props`, not BlockNote rich text, so there's no
 * `contentRef` here at all (unlike `lead`/`quote`/`note`). Plain URL
 * input, not a file-upload widget: the site has no image-upload endpoint
 * (images are already hand-placed under `web/public/`, same as before
 * this migration — see `BlockFields.tsx`'s previous "Image URL" field,
 * which this preserves as-is rather than growing new backend scope).
 */
export const ImageBlock = createReactBlockSpec(
    {
        type: "image",
        propSchema: {
            src: { default: "" },
            alt: { default: "" },
            caption: { default: "" },
        },
        content: "none",
    },
    {
        render: (props) => {
            const { src, alt, caption } = props.block.props;
            const update = (patch: Partial<{ src: string; alt: string; caption: string }>) =>
                props.editor.updateBlock(props.block, { props: patch });

            return (
                <div className="w-full flex flex-col gap-sm p-sm rounded-md border border-border-subtle bg-surface-raised/50" contentEditable={false}>
                    {src && (
                        // eslint-disable-next-line @next/next/no-img-element -- admin-authored preview of an arbitrary URL, same reasoning as ContentBlocks.tsx's public renderer
                        <img src={src} alt={alt} className="rounded-md border border-border-subtle max-h-[240px] object-contain" />
                    )}
                    <Field label="Image URL">
                        <Input value={src} onChange={(e) => update({ src: e.target.value })} placeholder="/images/foo.png" />
                    </Field>
                    <Field label="Alt text" hint="Required — describes the image for screen readers.">
                        <Input value={alt} onChange={(e) => update({ alt: e.target.value })} />
                    </Field>
                    <Field label="Caption (optional)">
                        <Input value={caption} onChange={(e) => update({ caption: e.target.value })} />
                    </Field>
                </div>
            );
        },
    },
);
