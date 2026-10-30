import type { ContentUrlState } from "@/features/edit-content-url";
import type { PostEditorForm } from "./types";

export function postPublicationIssues(form: PostEditorForm, url: ContentUrlState) {
    return (
        [
            ["title", form.title, "Title"],
            ["category", form.category, "Category"],
            ["excerpt", form.excerpt, "Excerpt"],
            ["slug", url.draftSlug, "URL"],
        ] as const
    )
        .filter(([, value]) => !value.trim())
        .map(([field, , label]) => ({ field, message: `${label} is required for publication.` }));
}
