"use client";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Text } from "@/shared/ui/text";
import { FieldControlContext } from "./field-context";

export interface FieldProps {
    label: string;
    htmlFor?: string;
    hint?: string;
    error?: string;
    className?: string;
    children: React.ReactNode;
}

/**
 * Label + control + hint/error — every admin form field goes through this
 * (Post/Work editors, the block editor's per-type fields, the login form),
 * so the label/error layout only needs to look right in one place.
 */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
    const generatedId = React.useId();
    const descriptionId = error || hint ? `${htmlFor ?? generatedId}-description` : undefined;
    return (
        <div className={cn("flex flex-col gap-xs", className)}>
            <label htmlFor={htmlFor} className="text-caption font-medium text-text-secondary">
                {label}
            </label>
            <FieldControlContext.Provider value={{ descriptionId, invalid: Boolean(error) }}>{children}</FieldControlContext.Provider>
            {error ? (
                <Text id={descriptionId} variant="micro" tone="primary" className="text-status-error normal-case tracking-normal">
                    {error}
                </Text>
            ) : hint ? (
                <Text id={descriptionId} variant="micro" tone="faint" className="normal-case tracking-normal">
                    {hint}
                </Text>
            ) : null}
        </div>
    );
}
