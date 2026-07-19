"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { BlockType } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/ui/form";
import { BLOCK_TYPE_OPTIONS, createEmptyDraftBlock, type DraftBlock } from "./draft-block";
import { BlockFields } from "./BlockFields";

export interface BlockListEditorProps {
    blocks: DraftBlock[];
    onChange: (blocks: DraftBlock[]) => void;
}

/**
 * Add/remove/reorder + per-type fields — the "block list editor" the
 * migration plan describes for Phase 4, shared verbatim between the Post
 * body editor and the Work case-study editor (a case study IS a document's
 * blocks, same as a post body — see backend/src/content/README.md's
 * unification rationale; the admin editor mirrors that at the UI layer
 * instead of building two near-identical block editors).
 *
 * Reordering is up/down buttons, not drag-and-drop: fully keyboard- and
 * screen-reader-operable for free, and doesn't pull in a DnD library for
 * what's normally a handful of blocks per document — matches "самая
 * простая админка".
 */
export function BlockListEditor({ blocks, onChange }: BlockListEditorProps) {
    const [typeToAdd, setTypeToAdd] = React.useState<BlockType>("paragraph");

    function addBlock() {
        onChange([...blocks, createEmptyDraftBlock(typeToAdd)]);
    }

    function removeBlock(clientId: string) {
        onChange(blocks.filter((b) => b.clientId !== clientId));
    }

    function moveBlock(clientId: string, direction: -1 | 1) {
        const index = blocks.findIndex((b) => b.clientId === clientId);
        const targetIndex = index + direction;
        if (index === -1 || targetIndex < 0 || targetIndex >= blocks.length) {
            return;
        }
        const next = [...blocks];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        onChange(next);
    }

    function updateBlock(clientId: string, next: DraftBlock) {
        onChange(blocks.map((b) => (b.clientId === clientId ? next : b)));
    }

    return (
        <div className="flex flex-col gap-md">
            {blocks.length === 0 && (
                <Text variant="caption" tone="faint">No blocks yet — add one below.</Text>
            )}

            {blocks.map((block, index) => {
                const label = BLOCK_TYPE_OPTIONS.find((opt) => opt.type === block.type)?.label ?? block.type;
                return (
                    <Card key={block.clientId} variant="outlined" className="p-md flex flex-col gap-sm">
                        <div className="flex items-center justify-between gap-sm">
                            <span className="text-micro font-semibold uppercase tracking-wider text-accent-text">{label}</span>
                            <div className="flex items-center gap-xs">
                                <IconButton label="Move up" onClick={() => moveBlock(block.clientId, -1)} disabled={index === 0}>
                                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                                </IconButton>
                                <IconButton label="Move down" onClick={() => moveBlock(block.clientId, 1)} disabled={index === blocks.length - 1}>
                                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                                </IconButton>
                                <IconButton label="Remove block" onClick={() => removeBlock(block.clientId)}>
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </IconButton>
                            </div>
                        </div>
                        <BlockFields draft={block} onChange={(next) => updateBlock(block.clientId, next)} />
                    </Card>
                );
            })}

            <div className="flex items-center gap-sm">
                <Select value={typeToAdd} onChange={(e) => setTypeToAdd(e.target.value as BlockType)} className="max-w-[200px]">
                    {BLOCK_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.type} value={opt.type}>{opt.label}</option>
                    ))}
                </Select>
                <Button type="button" variant="secondary" size="sm" onClick={addBlock}>+ Add block</Button>
            </div>
        </div>
    );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className="p-xs rounded-md text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
            {children}
        </button>
    );
}
