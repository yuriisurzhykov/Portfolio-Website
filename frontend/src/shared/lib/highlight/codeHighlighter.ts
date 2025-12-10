// src/shared/lib/highlight/codeHighlighter.ts
import Prism from "prismjs";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";

/**
 * Supported languages for syntax highlighting.
 */
export type CodeLanguage = "ts" | "tsx" | "js" | "jsx";

const languageMap: Record<CodeLanguage, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
};

/**
 * highlightCode
 * -------------
 * Pure function. Receives raw code and returns HTML with Prism tokens.
 */
export function highlightCode(code: string, language: CodeLanguage): string {
    const prismLanguage = languageMap[language];
    const grammar = Prism.languages[prismLanguage];

    if (!grammar) {
        return code;
    }

    return Prism.highlight(code, grammar, prismLanguage);
}
