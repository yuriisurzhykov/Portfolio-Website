import Prism from "prismjs";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-kotlin";

/**
 * Supported languages for syntax highlighting.
 */
export type CodeLanguage = "ts" | "tsx" | "js" | "jsx" | "kotlin";

const languageMap: Record<CodeLanguage, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    kotlin: "kotlin",
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
