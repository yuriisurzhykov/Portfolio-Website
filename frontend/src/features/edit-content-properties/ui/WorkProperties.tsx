"use client";
import * as React from "react";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import type { RelatedItemOption } from "@/shared/ui/related-item-picker";
import type { PropertyChange, WorkPropertiesValue } from "../model/types";
import { WorkCardProperties } from "./WorkCardProperties";
import { WorkCaseStudyProperties } from "./WorkCaseStudyProperties";

export interface WorkPropertiesProps {
    value: WorkPropertiesValue;
    onChange: PropertyChange<WorkPropertiesValue>;
    status: "in-progress" | "shipped";
    techStackSuggestions: string[];
    postOptions: RelatedItemOption[];
    urlField?: React.ReactNode;
    disabled?: boolean;
    errors?: Partial<Record<keyof WorkPropertiesValue, string>>;
}
export function WorkProperties({ disabled, urlField, ...props }: WorkPropertiesProps) {
    const [tab, setTab] = React.useState<"card" | "case-study">("card");
    const [confirmRemove, setConfirmRemove] = React.useState(false);
    return (
        <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-lg border-none p-none">
            <div>
                <h2 className="text-h3 font-semibold">Project details</h2>
                <p className="mt-xxs text-caption text-text-muted">What visitors see in Work.</p>
            </div>
            <div className="flex gap-xxs rounded-md bg-bg-app p-xxs" aria-label="Project properties">
                <Button
                    size="sm"
                    appearance="flat"
                    fullWidth
                    variant={tab === "card" ? "secondary" : "ghost"}
                    aria-pressed={tab === "card"}
                    onClick={() => setTab("card")}
                >
                    Card
                </Button>
                <Button
                    size="sm"
                    appearance="flat"
                    fullWidth
                    variant={tab === "case-study" ? "secondary" : "ghost"}
                    aria-pressed={tab === "case-study"}
                    onClick={() => setTab("case-study")}
                >
                    Case study
                </Button>
            </div>
            {tab === "card" ? (
                <WorkCardProperties {...props} />
            ) : (
                <WorkCaseStudyProperties {...props} onRemove={() => setConfirmRemove(true)} />
            )}
            {urlField}
            <Dialog open={confirmRemove} title="Remove case study" onClose={() => setConfirmRemove(false)}>
                <p className="mb-lg text-body text-text-secondary">
                    Remove the case-study body, dates, role and hero image from this draft? Public content changes only
                    when you publish.
                </p>
                <div className="flex flex-wrap gap-sm">
                    <Button variant="secondary" appearance="flat" onClick={() => setConfirmRemove(false)}>
                        Keep case study
                    </Button>
                    <Button
                        variant="danger"
                        appearance="flat"
                        onClick={() => {
                            props.onChange("hasCaseStudy", false);
                            setConfirmRemove(false);
                        }}
                    >
                        Remove case study
                    </Button>
                </div>
            </Dialog>
        </fieldset>
    );
}
