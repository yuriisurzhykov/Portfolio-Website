"use client";

import * as React from "react";
import { Button } from "@/shared/ui/button";

export interface DialogProps {
    open: boolean;
    title: string;
    onClose(): void;
    children: React.ReactNode;
    busy?: boolean;
}

/** The native top layer contains focus and avoids transformed-ancestor positioning bugs. */
export function Dialog({ open, title, onClose, children, busy = false }: DialogProps) {
    const ref = React.useRef<HTMLDialogElement>(null);
    const titleId = React.useId();
    React.useEffect(() => {
        const dialog = ref.current;
        if (!dialog || !open) return;
        const trigger = document.activeElement;
        dialog.showModal();
        return () => {
            if (dialog.open) dialog.close();
            if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
        };
    }, [open]);

    return <dialog ref={ref} aria-labelledby={titleId} aria-busy={busy}
        onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
        className="fixed inset-0 m-auto max-h-dvh w-full max-w-(--layout-content-reading) overflow-y-auto rounded-xl border border-border-default bg-surface-base p-lg text-text-primary shadow-surface-deep backdrop:bg-overlay-scrim">
        <div className="mb-lg flex items-center justify-between gap-md">
            <h2 id={titleId} className="text-h3 font-semibold">{title}</h2>
            <Button variant="ghost" size="sm" disabled={busy} onClick={onClose} aria-label={`Close ${title}`}>Close</Button>
        </div>
        {children}
    </dialog>;
}
