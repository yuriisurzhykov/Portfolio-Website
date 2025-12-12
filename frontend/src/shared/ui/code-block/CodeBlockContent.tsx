import * as React from "react";
import { type HTMLAttributes, type RefObject, useMemo } from "react";
import { cn } from "@/shared/lib";
import { type CodeLanguage, highlightCode, } from "@/shared/lib/highlight/codeHighlighter";
import type { CodeBlockVariant } from "./CodeBlock.types";

export type CodeBlockContentProps = HTMLAttributes<HTMLPreElement> & {
    variant: CodeBlockVariant;
    language: CodeLanguage;
    highlightEnabled: boolean;
    showLineNumbers: boolean;
    startLine: number;
    rawCode: string | null;
    /** Внутренний ref на <pre>, создаётся снаружи */
    innerRef: RefObject<HTMLPreElement | null>;
};

const variantStyles: Record<CodeBlockVariant, string> = {
    default: ["px-lg py-md", "leading-normal"].join(" "),
    compact: ["px-md py-sm", "leading-tight text-caption"].join(" "),
};

/**
 * CodeBlockContent
 * ----------------
 * Renders the actual code area with syntax highlighting and optional line numbers.
 */
export const CodeBlockContent: React.FC<CodeBlockContentProps> = ({
                                                                      variant,
                                                                      language,
                                                                      highlightEnabled,
                                                                      showLineNumbers,
                                                                      startLine,
                                                                      rawCode,
                                                                      innerRef,
                                                                      className,
                                                                      children,
                                                                      ...rest
                                                                  }) => {
    const highlightedHtml = useMemo(() => {
        if (!rawCode) return null;
        if (!highlightEnabled) return rawCode;
        return highlightCode(rawCode, language);
    }, [rawCode, highlightEnabled, language]);

    const hasStructuredLines = showLineNumbers && typeof rawCode === "string";

    const htmlLines =
        hasStructuredLines && typeof highlightedHtml === "string"
            ? highlightedHtml.split("\n")
            : null;

    return (
        <div className={cn("relative overflow-x-auto", variantStyles[variant])}>
            <pre
                ref={innerRef}
                className={cn(
                    "min-w-full whitespace-pre text-left",
                    `language-${language}`,
                    className
                )}
                {...rest}
            >
                {hasStructuredLines && htmlLines ? (
                    <code className="table w-full border-collapse">
                        {htmlLines.map((line, index) => (
                            <span key={index} className="table-row align-top">
                                <span className="table-cell pr-md text-right select-none text-caption text-text-muted">
                                    {startLine + index}
                                </span>
                                <span
                                    className="table-cell pl-sm"
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            line.length === 0
                                                ? "&nbsp;"
                                                : line,
                                    }}
                                />
                            </span>
                        ))}
                    </code>
                ) : (
                    <code
                        dangerouslySetInnerHTML={
                            typeof highlightedHtml === "string"
                                ? { __html: highlightedHtml }
                                : undefined
                        }
                    >
                        {typeof highlightedHtml !== "string" && children}
                    </code>
                )}
            </pre>
        </div>
    );
};
