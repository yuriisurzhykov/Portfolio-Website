"use client";

import * as React from "react";
import Prism from "prismjs";
import Editor from "react-simple-code-editor";
import "prismjs/components/prism-mermaid";
import "prismjs/components/prism-plant-uml";
import { createReactBlockSpec } from "@blocknote/react";
import { Diagram } from "@/shared/ui/diagram";
import { cn } from "@/shared/lib/utils";

type DiagramEngine = "mermaid" | "plantuml";

/**
 * Prism ships "mermaid" and "plant-uml"/"plantuml" grammars directly under
 * those exact names (verified in node_modules/prismjs/components/) — no
 * name-mapping table needed here, unlike codeHighlighter.ts's CodeLanguage,
 * which maps a handful of short aliases ("ts") onto Prism's own names
 * ("typescript"). Falls back to the raw, unhighlighted source if a grammar
 * somehow isn't registered, same defensive fallback as codeHighlighter.ts.
 */
function highlightSource(source: string, engine: DiagramEngine): string {
    const grammar = Prism.languages[engine];
    return grammar ? Prism.highlight(source, grammar, engine) : source;
}

interface SegmentedToggleProps<T extends string> {
    options: ReadonlyArray<{ value: T; label: string }>;
    value: T;
    onChange: (value: T) => void;
}

/**
 * The same pill-toggle look as widgets/nav/ThemeSegmentedToggle.tsx and this editor's own
 * NoteBlock variant picker - one visual pattern for "pick one of a few options inline,"
 * reused here for two different choices (engine, edit/preview) rather than inventing a
 * new control for each.
 * */
function SegmentedToggle<T extends string>({ options, value, onChange }: SegmentedToggleProps<T>) {
    return (
        <div className="flex items-center gap-[2px] bg-surface-icon border border-border-subtle rounded-pill p-[3px]" contentEditable={false}>
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        aria-pressed={isActive}
                        className={cn(
                            "rounded-pill px-sm py-[5px]",
                            "font-mono font-semibold text-micro uppercase",
                            "transition-colors duration-fast",
                            isActive ? "bg-text-primary text-bg-app" : "text-text-muted hover:text-text-primary",
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

const ENGINE_OPTIONS: ReadonlyArray<{ value: DiagramEngine; label: string }> = [
    { value: "mermaid", label: "Mermaid" },
    { value: "plantuml", label: "PlantUML" },
];

const MODE_OPTIONS: ReadonlyArray<{ value: "edit" | "preview"; label: string }> = [
    { value: "edit", label: "Edit" },
    { value: "preview", label: "Preview" },
];

/**
 * Diagram source + live preview using the exact same renderer the public
 * site uses (<Diagram>) — an admin sees precisely what will publish, not a
 * guess. `content: "none"` — same reasoning as CodeBlock/ImageBlock: a
 * diagram's actual content is entirely `props` (engine/source/caption), not
 * BlockNote rich text.
 *
 * Edit/Preview is a local `useState`, not a block prop — which mode you're
 * looking at isn't part of the saved document, just this session's UI
 * state (reopening the post later always starts in Edit).
 */
export const DiagramBlock = createReactBlockSpec(
    {
        type: "diagram",
        propSchema: {
            engine: { default: "mermaid" as DiagramEngine, values: ["mermaid", "plantuml"] as const },
            source: { default: "" },
            caption: { default: "" },
        },
        content: "none",
    },
    {
        render: (props) => {
            const { engine, source, caption } = props.block.props;
            const [mode, setMode] = React.useState<"edit" | "preview">("edit");
            const update = (patch: Partial<{ engine: DiagramEngine; source: string; caption: string }>) =>
                props.editor.updateBlock(props.block, { props: patch });

            return (
                <div
                    className="w-full flex flex-col gap-sm p-sm rounded-md border border-border-subtle bg-surface-raised/50"
                    contentEditable={false}
                >
                    <div className="flex items-center justify-between">
                        <SegmentedToggle options={ENGINE_OPTIONS} value={engine} onChange={(value) => update({ engine: value })} />
                        <SegmentedToggle options={MODE_OPTIONS} value={mode} onChange={setMode} />
                    </div>

                    {mode === "edit" ? (
                        <div className="rounded-md border border-border-subtle bg-surface-base font-mono text-caption overflow-x-auto">
                            <Editor
                                value={source}
                                onValueChange={(value) => update({ source: value })}
                                highlight={(code) => highlightSource(code, engine)}
                                padding={12}
                                placeholder="Diagram source…"
                                style={{ minHeight: "8rem" }}
                            />
                        </div>
                    ) : source ? (
                        <Diagram engine={engine} source={source} />
                    ) : (
                        <div className="h-30 flex items-center justify-center rounded-md border border-border-subtle bg-surface-raised/50 text-caption text-text-faint">
                            Nothing to preview yet
                        </div>
                    )}

                    {/* Plain <input>, not the shared <Input> — inputBaseStyles' border/padding
                        would need overriding for this Confluence-style "unobtrusive caption"
                        look, and cn() here is plain clsx (no tailwind-merge), so a conflicting
                        override wouldn't reliably win — simpler and safer to style from scratch. */}
                    <input
                        value={caption}
                        onChange={(e) => update({ caption: e.target.value })}
                        placeholder="Add a caption…"
                        className="w-full bg-transparent border-0 border-t border-border-subtle pt-xs text-caption text-text-secondary placeholder:text-text-faint focus:outline-none"
                    />
                </div>
            );
        },
    },
);