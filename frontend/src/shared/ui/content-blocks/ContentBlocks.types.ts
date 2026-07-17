import type { CodeLanguage } from "@/shared/lib/highlight/codeHighlighter";

export type ContentBlock =
    | { type: "lead"; text: string }
    | { type: "paragraph"; text: string }
    | { type: "heading"; text: string }
    | { type: "code"; filename: string; language?: CodeLanguage; code: string };
