import * as React from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib";
import type { CodeBlockLabels } from "./CodeBlock.types";

export type CodeBlockToolbarProps = {
    title?: ReactNode;
    copyable: boolean;
    canCopy: boolean;
    copied: boolean;
    labels: CodeBlockLabels;
    onCopy: () => void;
};

const toolbarBaseStyles =
    [
        "flex items-center justify-between",
        "px-md py-xs",
        "bg-bg-strip",
        "border-b border-border-subtle",
    ].join(" ");

const trafficLightDotStyles =
    [
        "inline-block",
        "w-xxs h-xxs",
        "rounded-full",
    ].join(" ");

const copyButtonStyles =
    [
        "inline-flex items-center gap-xxs",
        "rounded-pill px-xs py-xxs",
        "text-caption text-text-secondary",
        "transition-colors",
        "duration-fast ease-standard",
        "hover:bg-surface-raised hover:text-text-primary",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-highlight",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-strip",
    ].join(" ");

type CopyIconProps = {
    className?: string;
};

const CopyIcon: React.FC<CopyIconProps> = ({ className }) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn("inline-block align-middle", className)}
    >
        <rect
            x="9"
            y="9"
            width="11"
            height="11"
            rx="2"
            ry="2"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
        />
        <rect
            x="4"
            y="4"
            width="11"
            height="11"
            rx="2"
            ry="2"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
        />
    </svg>
);

/**
 * CodeBlockToolbar
 * ----------------
 * Editor-like top bar with traffic lights, optional title and copy button.
 */
export const CodeBlockToolbar: React.FC<CodeBlockToolbarProps> = ({
                                                                      title,
                                                                      copyable,
                                                                      canCopy,
                                                                      copied,
                                                                      labels,
                                                                      onCopy,
                                                                  }) => {
    const showCopyButton = copyable && canCopy;

    return (
        <div className={toolbarBaseStyles}>
            <div className="flex items-center gap-xxs">
                <span
                    className={cn(trafficLightDotStyles, "bg-status-error")}
                />
                <span
                    className={cn(trafficLightDotStyles, "bg-status-warning")}
                />
                <span
                    className={cn(trafficLightDotStyles, "bg-status-success")}
                />
            </div>

            {title && (
                <div className="flex-1 px-sm text-center text-caption text-text-secondary truncate">
                    {title}
                </div>
            )}

            {showCopyButton ? (
                <button
                    type="button"
                    className={copyButtonStyles}
                    onClick={onCopy}
                    aria-label={
                        copied ? labels.copiedButton : labels.copyButton
                    }
                >
                    <span className="inline-flex items-center">
                        <CopyIcon />
                    </span>
                    <span className="hidden sm:inline">
                        {copied ? labels.copiedButton : labels.copyButton}
                    </span>
                </button>
            ) : (
                // Balancing layout right, when copying is disabled
                <div className="w-sm" aria-hidden="true" />
            )}
        </div>
    );
};
