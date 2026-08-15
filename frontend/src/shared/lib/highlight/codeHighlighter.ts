import Prism from "prismjs";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-kotlin";

// Disables PrismJS's own auto-highlight-the-whole-document behavior, which
// otherwise fights with React's hydration of the same elements — caused a
// real hydration mismatch, see this package's README's dated entry.
Prism.manual = true;

/**
 * Supported languages for syntax highlighting.
 */
export type CodeLanguage = "ts" | "tsx" | "js" | "jsx" | "kotlin" | "kts" | "java" | "py";

const languageMap: Record<CodeLanguage, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    kotlin: "kotlin",
    kts: "kotlin",
    java: "java",
    py: "python",
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
