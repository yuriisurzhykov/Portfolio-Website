// src/shared/ui/code/CodeBlock.tsx
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { CodeBlockSurface } from "./CodeBlockSurface";
import { CodeBlockToolbar } from "./CodeBlockToolbar";
import { CodeBlockContent } from "./CodeBlockContent";
import type { CodeBlockProps } from "./CodeBlock.types";

/**
 * CodeBlock
 * ---------
 * Design-system component for showing code with syntax highlighting,
 * line numbers and copy-to-clipboard support.
 */
export const CodeBlock = forwardRef<HTMLPreElement, CodeBlockProps>(
    (
        {
            className,
            title,
            variant = "default",
            showLineNumbers = true,
            startLine = 1,
            copyable = true,
            copyText,
            language = "ts",
            highlightEnabled = true,
            labels,
            children,
            ...rest
        },
        ref
    ) => {
        const [copied, setCopied] = useState(false);

        // Внутренний ref на <pre>
        const innerRef = useRef<HTMLPreElement>(null);

        // Прокидываем наружу именно innerRef.current
        useImperativeHandle(ref, () => {
            if (!innerRef.current) {
                throw new Error("CodeBlock: <pre> element is not mounted yet");
            }
            return innerRef.current
        }, [innerRef]);

        /**
         * Выбираем текст для копирования:
         * - явный copyText
         * - иначе children, если это строка
         */
        const textToCopy = useMemo(() => {
            if (typeof copyText === "string") {
                return copyText;
            }

            if (typeof children === "string") {
                return children;
            }

            return null;
        }, [copyText, children]);

        // Нормализуем код (убираем лишний финальный \n)
        const rawCode = useMemo(() => {
            if (typeof textToCopy === "string") {
                return textToCopy.replace(/\n$/, "");
            }

            if (typeof children === "string") {
                return children.replace(/\n$/, "");
            }

            return null;
        }, [textToCopy, children]);

        // Сбрасываем состояние "copied" через 1.5 секунды
        useEffect(() => {
            if (!copied) return;
            const timerId = window.setTimeout(() => setCopied(false), 1500);
            return () => window.clearTimeout(timerId);
        }, [copied]);

        const handleCopy = async () => {
            if (!textToCopy) return;

            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(textToCopy);
                } else {
                    const textarea = document.createElement("textarea");
                    textarea.value = textToCopy;
                    textarea.style.position = "fixed";
                    textarea.style.opacity = "0";
                    document.body.appendChild(textarea);
                    textarea.select();
                    // noinspection JSDeprecatedSymbols
                    document.execCommand("copy");
                    document.body.removeChild(textarea);
                }

                setCopied(true);
            } catch {
                // Best-effort: не ломаем UI, если clipboard недоступен
            }
        };

        const canCopy = Boolean(textToCopy);

        return (
            <CodeBlockSurface className={className}>
                <CodeBlockToolbar
                    title={title}
                    copyable={copyable}
                    canCopy={canCopy}
                    copied={copied}
                    labels={labels}
                    onCopy={handleCopy}
                />

                <CodeBlockContent
                    variant={variant}
                    language={language}
                    highlightEnabled={highlightEnabled}
                    showLineNumbers={showLineNumbers}
                    startLine={startLine}
                    rawCode={rawCode}
                    innerRef={innerRef}
                    {...rest}
                >
                    {children}
                </CodeBlockContent>

                {/* Live region для screen readers */}
                <span aria-live="polite" className="sr-only">
                    {copied ? labels.liveRegionCopied : undefined}
                </span>
            </CodeBlockSurface>
        );
    }
);

CodeBlock.displayName = "CodeBlock";
