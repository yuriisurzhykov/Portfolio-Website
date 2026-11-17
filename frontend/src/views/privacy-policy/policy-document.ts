/** One table of a policy: every row has exactly as many cells as there are columns. */
export interface PolicyTable {
    columns: string[];
    rows: string[][];
}

/**
 * A block of a section. Strings are inline Markdown (bold, code, links) —
 * the same subset `shared/ui/markdown` renders, which never interprets raw HTML.
 */
export type PolicyBlock =
    | { kind: "paragraph"; text: string }
    | { kind: "list"; items: string[] }
    | { kind: "table"; table: PolicyTable };

export interface PolicySection {
    heading: string;
    blocks: PolicyBlock[];
}

export interface PolicyDocument {
    title: string;
    /** ISO date (`YYYY-MM-DD`) shown as "Last updated". */
    updated: string;
    intro: string;
    sections: PolicySection[];
}
