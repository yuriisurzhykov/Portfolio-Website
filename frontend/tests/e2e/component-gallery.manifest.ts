/**
 * COMPONENT GALLERY — the curated list of `shared/ui` components screenshot-tested in isolation.
 * ----------------------------------------------------------------------------------------------
 * Complements `visual-fixtures.manifest.ts`: that file pixel-diffs whole PAGES (catches "does the
 * real integrated page still look right"), this one pixel-diffs individual COMPONENTS rendered on
 * the `/storybook` playground (catches "did THIS component's own appearance change", independent
 * of whether any of the 5 curated pages happen to use it in a way that would show the change).
 *
 * Each `id` below must match exactly one `data-component-id="<id>"` attribute on a `<section>` in
 * `frontend/src/feature/design-system/DesignSystemPlayground.tsx` or `frontend/src/views/storybook/Storybook.tsx`.
 * `component-gallery.spec.ts`'s own guard test asserts this list and the live page's
 * `[data-component-id]` elements are exactly the same set — so forgetting to add/remove an entry
 * here when a demo section is added/removed fails loudly in CI instead of silently under- or
 * over-covering the design system.
 *
 * Deliberately excluded (see frontend/tests/README.md, section 4, for the full reasoning):
 * - Admin-only/interactive components (`admin-list-item`, `icon-picker`, `block-editor`, `drawer`,
 *   `back-to-top`, `status-toggle`, `status-page`, `form/*`, `token-combobox`, `related-item-picker`)
 *   — need auth context or real interaction to show anything, or are better covered by page-level
 *   tests.
 *   `token-combobox`'s only real caller (`WorkEditorPage`'s Stack field) is behind admin auth, and
 *   its actual value (fuzzy dropdown, keyboard nav, "did you mean" hints) only shows up through
 *   interaction a static screenshot can't exercise — its own `TokenCombobox.test.tsx` covers that
 *   behavior directly instead.
 *   `related-item-picker` (added 2026-08-11) is the exact same case, for the exact same reason —
 *   its only callers (`PostEditorPage`'s/`WorkEditorPage`'s related-item fields) are behind admin
 *   auth, and its value is entirely in interaction (fuzzy search, keyboard nav, commit-only-a-real-
 *   option). Covered directly by `RelatedItemPicker.test.tsx` instead.
 * - `Diagram`'s PlantUML engine — depends on a self-hosted `plantuml-server` that Playwright's
 *   `webServer` never starts; only the fully client-side Mermaid engine is demoed.
 * - `Section` — already exercised as the outer wrapper of this very page and of every page-level
 *   fixture; a redundant isolated demo would add baseline weight with no new signal.
 */
export interface ComponentGalleryEntry {
    id: string;
    label: string;
}

export const componentGalleryManifest: ComponentGalleryEntry[] = [
    { id: "text", label: "Text" },
    { id: "surface", label: "Surface" },
    { id: "card", label: "Card" },
    { id: "icon-badge", label: "IconBadge" },
    { id: "tag", label: "Tag" },
    { id: "tech-icon", label: "TechIcon" },
    { id: "tooltip", label: "Tooltip" },
    { id: "button", label: "Button" },
    { id: "progress", label: "ProgressBar" },
    { id: "code-block", label: "CodeBlock" },
    { id: "eyebrow", label: "Eyebrow" },
    { id: "status-badge", label: "StatusBadge" },
    { id: "placeholder-cover", label: "PlaceholderCover" },
    { id: "cover-image", label: "CoverImage" },
    { id: "markdown", label: "Markdown" },
    { id: "diagram", label: "Diagram (mermaid)" },
    { id: "content-blocks", label: "ContentBlocks" },
    { id: "skill-card", label: "SkillCard" },
    { id: "tag-list", label: "TagList" },
    { id: "related-content-callout", label: "RelatedContentCallout" },
    { id: "related-link", label: "CompactRelatedLink" },
    { id: "work-cover-image", label: "WorkCoverImage" },
    { id: "project-graph", label: "ProjectGraph" },
    { id: "design-tokens", label: "DesignTokens" },
];
