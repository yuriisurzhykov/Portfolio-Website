import type { CodeLanguage } from "@/shared/lib/highlight/codeHighlighter";
import type { Localized } from "@/shared/i18n";

export type ContentBlock =
    | { type: "lead"; text: Localized<string> }
    | { type: "paragraph"; text: Localized<string> }
    | { type: "heading"; text: Localized<string> }
    | { type: "code"; filename: string; language?: CodeLanguage; code: string };
