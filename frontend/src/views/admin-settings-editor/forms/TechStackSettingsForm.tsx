"use client";

import * as React from "react";
import type { TechStackContent } from "@portfolio/backend";
import { SettingsFormFooter } from "../fields/SettingsFormFooter";
import { TechStackEditor, toTechStackContent, withIds, type IdentifiedTech } from "../tech-stack";
import { useSiteContentForm } from "../useSiteContentForm";

/**
 * Holds the list as `IdentifiedTech[]` (each row plus a client-only id),
 * not as the raw `TechStackContent` the API takes — the same "keep the
 * editing representation, convert only at submit" convention every other
 * settings form here already follows for its own derived shape (comma-
 * joined chips, newline-joined heading lines). See `identified-tech.ts`
 * for why a row needs an identity the storage format doesn't give it.
 */
export function TechStackSettingsForm({ initialData }: { initialData: TechStackContent }) {
    const [rows, setRows] = React.useState<IdentifiedTech[]>(() => withIds(initialData));
    const [savedRows, setSavedRows] = React.useState<IdentifiedTech[]>(rows);
    const { submitting, error, savedAt, submit } = useSiteContentForm("techStack");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        // Snapshotted before the await so a save that lands while the admin
        // keeps typing marks exactly what was sent as saved, not whatever
        // the list happens to be when the response arrives.
        const submitted = rows;
        void submit(toTechStackContent(submitted)).then((succeeded) => {
            if (succeeded) {
                setSavedRows(submitted);
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <TechStackEditor rows={rows} onChange={setRows} />
            <SettingsFormFooter submitting={submitting} error={error} savedAt={savedAt} dirty={rows !== savedRows} />
        </form>
    );
}
