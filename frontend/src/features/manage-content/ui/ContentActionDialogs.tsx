import { Dialog } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import type { ConfirmAction, PublicationIssue } from "../model/useContentActions";
export function PublicationReviewDialog({
    open,
    onClose,
    onConfirm,
    busy,
    title,
    url,
    summary,
    published,
    issues,
    error,
    onFix,
}: {
    open: boolean;
    onClose(): void;
    onConfirm(): void;
    busy: boolean;
    title: string;
    url: string;
    summary: { label: string; value: string }[];
    published: boolean;
    issues: PublicationIssue[];
    error: string | null;
    onFix(): void;
}) {
    return (
        <Dialog open={open} onClose={onClose} title="Review publication" busy={busy}>
            <div className="flex flex-col gap-lg">
                <div>
                    <h3 className="text-h3">{title || "Untitled draft"}</h3>
                    <p className="mt-xs break-all font-mono text-caption text-text-secondary">{url}</p>
                </div>
                <p className="text-body text-text-secondary">
                    {published
                        ? "Apply this draft to the public site. Existing translations are preserved."
                        : "Make this draft visible on the public site. Its URL will stop following the title."}
                </p>
                <dl className="flex flex-col gap-sm rounded-md border border-border-subtle p-md">
                    {summary.map((item) => (
                        <div key={item.label} className="flex flex-col gap-xxs">
                            <dt className="text-caption text-text-muted">{item.label}</dt>
                            <dd className="break-words text-body text-text-primary">{item.value || "Not set"}</dd>
                        </div>
                    ))}
                </dl>
                {issues.length > 0 && (
                    <div role="alert">
                        <p className="mb-sm font-semibold">Complete these details first:</p>
                        <ul className="list-disc pl-lg">
                            {issues.map((issue) => (
                                <li key={issue.field}>{issue.message}</li>
                            ))}
                        </ul>
                        <Button className="mt-md" appearance="flat" variant="secondary" onClick={onFix}>
                            Edit details
                        </Button>
                    </div>
                )}
                {error && (
                    <p role="alert" className="text-status-error">
                        {error}
                    </p>
                )}
                <Button appearance="flat" disabled={busy || issues.length > 0} loading={busy} onClick={onConfirm}>
                    {published ? "Publish changes" : "Publish now"}
                </Button>
            </div>
        </Dialog>
    );
}
const messages: Record<ConfirmAction, { title: string; body: string; label: string }> = {
    discard: {
        title: "Discard changes",
        body: "Remove every unpublished change and restore the saved live version?",
        label: "Discard changes",
    },
    unpublish: {
        title: "Unpublish content",
        body: "Remove this content from the public site? Your draft and its URL are preserved.",
        label: "Unpublish",
    },
    delete: {
        title: "Delete content",
        body: "Permanently delete this content, its draft and translations? This cannot be undone.",
        label: "Delete permanently",
    },
};
export function ConfirmContentActionDialog({
    action,
    onClose,
    onConfirm,
    busy,
    error,
}: {
    action: ConfirmAction | null;
    onClose(): void;
    onConfirm(action: ConfirmAction): void;
    busy: boolean;
    error: string | null;
}) {
    const message = messages[action ?? "discard"];
    return (
        <Dialog open={action !== null} title={message.title} onClose={onClose} busy={busy}>
            <p className="mb-lg text-body text-text-secondary">{message.body}</p>
            {error && (
                <p role="alert" className="mb-md text-status-error">
                    {error}
                </p>
            )}
            <div className="flex gap-sm">
                <Button appearance="flat" variant="secondary" disabled={busy} onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    appearance="flat"
                    variant="danger"
                    disabled={busy}
                    loading={busy}
                    onClick={() => action && onConfirm(action)}
                >
                    {message.label}
                </Button>
            </div>
        </Dialog>
    );
}
