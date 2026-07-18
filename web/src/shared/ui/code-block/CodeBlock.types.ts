import type { HTMLAttributes, ReactNode } from "react";
import type { CodeLanguage } from "@/shared/lib/highlight/codeHighlighter";

/**
 * Visual density of the code block.
 */
export type CodeBlockVariant = "default" | "compact";

/**
 * Text labels for the CodeBlock.
 * All strings are provided externally (i18n or parent),
 * there is no text hardcoded inside the component.
 *
 * Recommended i18n keys (example):
 * - "ui.codeBlock.copyButton.label"
 * - "ui.codeBlock.copiedButton.label"
 * - "ui.codeBlock.liveRegion.copied"
 */
export type CodeBlockLabels = {
    /** Copy button label in normal state */
    copyButton: string;
    /** Copy button label after a successful copy */
    copiedButton: string;
    /** Live region message when code has been copied */
    liveRegionCopied: string;
};

/**
 * Public props for the CodeBlock component.
 */
export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
    /** Title in the top toolbar (e.g., file name) */
    title?: ReactNode;
    /** Density variant */
    variant?: CodeBlockVariant;
    /** Whether to render line numbers (works only with string content) */
    showLineNumbers?: boolean;
    /** Starting line number */
    startLine?: number;
    /** Enable copy-to-clipboard button */
    copyable?: boolean;
    /** Text that will be copied. If omitted, children (string) will be used */
    copyText?: string;
    /** Language used for syntax highlighting */
    language?: CodeLanguage;
    /** Enable Prism highlighting */
    highlightEnabled?: boolean;
    /** Text labels from i18n or parent component */
    labels: CodeBlockLabels;
};
