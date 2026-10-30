import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";

export interface EditorStatusBarProps {
    kind: "Journal" | "Work";
    title: string;
    dateLabel?: string;
    saveLabel: string;
    saveFailed: boolean;
    published: boolean;
    hasUnpublishedChanges: boolean;
    onBack(): void;
}
export function EditorStatusBar({
    kind,
    title,
    dateLabel,
    saveLabel,
    saveFailed,
    published,
    hasUnpublishedChanges,
    onBack,
}: EditorStatusBarProps) {
    return (
        <header className="flex min-h-(--layout-navbar-height) shrink-0 flex-wrap items-center justify-between gap-sm border-b border-border-subtle bg-surface-base px-lg py-md">
            <div className="flex min-w-0 items-center gap-sm">
                <Button
                    variant="ghost"
                    size="sm"
                    appearance="flat"
                    aria-label={`Back to ${kind}`}
                    onClick={onBack}
                    iconLeft={<ArrowLeft className="size-md" aria-hidden="true" />}
                />
                <span className="shrink-0 whitespace-nowrap font-mono text-caption text-accent-text">Y /</span>
                <span className="text-caption">{kind}</span>
                <span className="text-text-muted">/</span>
                <span className="max-w-(--layout-hero-graph-height) truncate text-caption text-text-secondary">
                    {title || "Untitled draft"}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-sm text-caption">
                {dateLabel && <span className="text-text-muted">{dateLabel}</span>}
                <span role="status" className={saveFailed ? "text-status-error" : "text-text-secondary"}>
                    {saveLabel}
                </span>
                <StatusBadge tone={published ? "success" : "neutral"}>{published ? "Published" : "Draft"}</StatusBadge>
                {published && hasUnpublishedChanges && <StatusBadge tone="warning">Unpublished changes</StatusBadge>}
            </div>
        </header>
    );
}
