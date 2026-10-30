"use client";
import * as React from "react";
export interface PublicationIssue {
    field: string;
    message: string;
}
export type ConfirmAction = "discard" | "unpublish" | "delete";
export interface ContentActionPort {
    flushDraft(): Promise<void>;
    getResourceSlug(): string | null;
    getEditRevision(): number;
    validateForPublication(): PublicationIssue[];
    publish(): Promise<void>;
    unpublish(): Promise<void>;
    discardDraft(): Promise<void>;
    deleteContent(): Promise<void>;
    onDeleted?(): void;
}
/** Serializes all asynchronous actions, including the event before React commits disabled controls. */
export function useContentActions(port: ContentActionPort) {
    const portRef = React.useRef(port);
    React.useLayoutEffect(() => {
        portRef.current = port;
    });
    const busyRef = React.useRef(false);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [issues, setIssues] = React.useState<PublicationIssue[]>([]);
    const [reviewOpen, setReviewOpen] = React.useState(false);
    const [confirmation, setConfirmation] = React.useState<ConfirmAction | null>(null);
    const reviewedRevision = React.useRef<number | null>(null);
    async function run(work: () => Promise<void>) {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        setError(null);
        try {
            await work();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "The action failed. Try again.");
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }
    function requireResource() {
        const slug = portRef.current.getResourceSlug();
        if (!slug) throw new Error("Write and save a draft before continuing.");
        return slug;
    }
    async function reviewPublication() {
        await run(async () => {
            await portRef.current.flushDraft();
            const next = portRef.current.validateForPublication();
            setIssues(next);
            if (!next.length) requireResource();
            reviewedRevision.current = portRef.current.getEditRevision();
            setReviewOpen(true);
        });
    }
    async function confirmPublication() {
        await run(async () => {
            await portRef.current.flushDraft();
            requireResource();
            const next = portRef.current.validateForPublication();
            setIssues(next);
            if (next.length) return;
            const revision = portRef.current.getEditRevision();
            if (reviewedRevision.current !== revision) {
                reviewedRevision.current = revision;
                setError("The draft changed. Review the latest details and confirm again.");
                return;
            }
            await portRef.current.publish();
            setReviewOpen(false);
        });
    }
    async function confirmAction(action: ConfirmAction) {
        await run(async () => {
            // A blur save may already be running. Destructive intent survives its failure,
            // but the API mutation must wait for that request to settle.
            if (action === "discard" || action === "delete") await portRef.current.flushDraft().catch(() => {});
            else await portRef.current.flushDraft();
            requireResource();
            if (action === "discard") await portRef.current.discardDraft();
            else if (action === "delete") {
                await portRef.current.deleteContent();
                portRef.current.onDeleted?.();
            } else await portRef.current.unpublish();
            setConfirmation(null);
        });
    }
    async function navigate(destination: (slug: string | null) => void) {
        await run(async () => {
            await portRef.current.flushDraft();
            destination(portRef.current.getResourceSlug());
        });
    }
    function preview(path: (slug: string) => string) {
        if (busyRef.current) return;
        // Open during the user gesture so popup blockers do not reject the async result.
        const tab = window.open("about:blank", "_blank");
        if (tab) tab.opener = null;
        void run(async () => {
            try {
                await portRef.current.flushDraft();
                const url = path(requireResource());
                if (!tab) throw new Error("Allow popups to open the preview.");
                tab.location.replace(url);
            } catch (cause) {
                tab?.close();
                throw cause;
            }
        });
    }
    return {
        busy,
        isBusy: () => busyRef.current,
        error,
        issues,
        reviewOpen,
        closeReview: () => {
            if (!busyRef.current) setReviewOpen(false);
        },
        confirmation,
        requestConfirmation: setConfirmation,
        closeConfirmation: () => {
            if (!busyRef.current) setConfirmation(null);
        },
        reviewPublication,
        confirmPublication,
        confirmAction,
        navigate,
        preview,
        retrySave: () => run(() => portRef.current.flushDraft()),
    };
}
