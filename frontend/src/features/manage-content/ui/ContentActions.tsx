import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
export function ContentActions({
    published,
    hasChanges,
    hasResource,
    busy,
    onReview,
    onPreview,
    onHistory,
    onTranslation,
    onDiscard,
    onUnpublish,
    onDelete,
    children,
}: {
    published: boolean;
    hasChanges: boolean;
    hasResource: boolean;
    busy: boolean;
    onReview(): void;
    onPreview(): void;
    onHistory(): void;
    onTranslation(): void;
    onDiscard(): void;
    onUnpublish(): void;
    onDelete(): void;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-lg">
            <div>
                <h2 className="text-h3 font-semibold">Publication</h2>
                <p className="mt-xxs text-caption text-text-muted">Drafts stay private until you publish.</p>
            </div>
            <Button appearance="flat" fullWidth disabled={busy || (published && !hasChanges)} onClick={onReview}>
                {published ? "Review changes" : "Review & publish"}
            </Button>
            <Button appearance="flat" variant="secondary" fullWidth disabled={busy} onClick={onPreview}>
                Preview
            </Button>
            {children}
            <div className="flex flex-col gap-xs border-t border-border-subtle pt-md">
                <Button appearance="flat" variant="ghost" fullWidth disabled={busy || !hasResource} onClick={onHistory}>
                    Version history
                </Button>
                <Button
                    appearance="flat"
                    variant="ghost"
                    fullWidth
                    disabled={busy || !hasResource}
                    onClick={onTranslation}
                >
                    Translation
                </Button>
                {hasChanges && hasResource && (
                    <Button appearance="flat" variant="ghost" fullWidth disabled={busy} onClick={onDiscard}>
                        Discard changes
                    </Button>
                )}
                {published && (
                    <Button appearance="flat" variant="ghost" fullWidth disabled={busy} onClick={onUnpublish}>
                        Unpublish
                    </Button>
                )}
            </div>
            {hasResource && (
                <details className="border-t border-border-subtle pt-md">
                    <summary className="cursor-pointer text-caption text-text-muted">More actions</summary>
                    <Button appearance="flat" variant="danger" fullWidth disabled={busy} onClick={onDelete}>
                        Delete
                    </Button>
                </details>
            )}
        </div>
    );
}
