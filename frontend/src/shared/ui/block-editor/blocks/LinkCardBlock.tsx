"use client";

import * as React from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { SmartLinkBlock } from "@/shared/ui/smart-link";
import { Field, Input } from "@/shared/ui/form";
import { useEditorLinkPreview } from "../link-preview-client";
import { SegmentedToggle } from "./SegmentedToggle";

type LinkCardView = "row" | "card";

const VIEW_OPTIONS: ReadonlyArray<{ value: LinkCardView; label: string }> = [
    { value: "row", label: "Row" },
    { value: "card", label: "Card" },
];

/** URL typing is debounced before the server is asked to fetch anything — see `link-preview-client.ts`. */
const URL_DEBOUNCE_MS = 400;

/**
 * The `linkCard` block: a smart link as a compact row or a full card
 * (mockups "2. Компактная строка" / "3. Полная карточка"). `content:
 * "none"` like ImageBlock — everything is props: the URL, the view, an
 * optional title override and caption. The preview below the controls is
 * the public `<SmartLinkBlock>` itself, fed the snapshot the admin endpoint
 * just produced, so what the author sees is what will publish; it is
 * `inert` so clicking the card inside the editor never navigates away from
 * a draft.
 *
 * The last fetch error is shown only here — the public page silently falls
 * back to a plain link (see `backend/src/link-preview/README.md`).
 */
export const LinkCardBlock = createReactBlockSpec(
    {
        type: "linkCard",
        propSchema: {
            url: { default: "" },
            view: { default: "card" as LinkCardView, values: ["row", "card"] as const },
            titleOverride: { default: "" },
            caption: { default: "" },
        },
        content: "none",
    },
    {
        render: (props) => {
            const { url, view, titleOverride, caption } = props.block.props;
            const { preview, loading, refresh } = useEditorLinkPreview(url.trim(), URL_DEBOUNCE_MS);
            const update = (patch: Partial<{ url: string; view: LinkCardView; titleOverride: string; caption: string }>) =>
                props.editor.updateBlock(props.block, { props: patch });

            const status = !url.trim()
                ? "Paste a link to preview it."
                : loading
                    ? "Fetching preview…"
                    : !preview
                        ? "No preview — this will publish as a plain link."
                        : preview.status === "failed"
                            ? `Last fetch failed: ${ preview.lastError ?? "unknown error" }`
                            : null;

            return (
                <div className="w-full flex flex-col gap-sm p-sm rounded-md border border-border-subtle bg-surface-raised/50" contentEditable={ false }>
                    <div className="flex items-center justify-between gap-sm">
                        <SegmentedToggle options={ VIEW_OPTIONS } value={ view } onChange={ (value) => update({ view: value }) }/>
                        <button
                            type="button"
                            onClick={ refresh }
                            disabled={ !url.trim() || loading }
                            className="inline-flex items-center gap-xs rounded-pill px-sm py-xxs font-mono text-micro uppercase text-text-muted hover:text-text-primary disabled:opacity-50"
                        >
                            <RefreshCw size={ 12 } aria-hidden="true" className={ cn(loading && url.trim() && "animate-spin") }/>
                            Refresh
                        </button>
                    </div>

                    <Field label="Link URL">
                        <Input value={ url } onChange={ (e) => update({ url: e.target.value }) } placeholder="https://…" inputMode="url"/>
                    </Field>

                    { url.trim() && (
                        <div inert>
                            <SmartLinkBlock url={ url.trim() } view={ view } titleOverride={ titleOverride || undefined } preview={ preview }/>
                        </div>
                    ) }
                    { status && <p className="m-0 text-caption text-text-muted" role="status">{ status }</p> }

                    <Field label="Title override (optional)" hint="Replaces the page's own title on this card only.">
                        <Input value={ titleOverride } onChange={ (e) => update({ titleOverride: e.target.value }) }/>
                    </Field>
                    <Field label="Caption (optional)">
                        <Input value={ caption } onChange={ (e) => update({ caption: e.target.value }) }/>
                    </Field>
                </div>
            );
        },
        /** Copy/drag out gives the bare link, which this editor's own paste handler turns back into a card (`paste-handler.ts`). */
        toExternalHTML: (props) => <p><a href={ props.block.props.url }>{ props.block.props.url }</a></p>,
    },
);
