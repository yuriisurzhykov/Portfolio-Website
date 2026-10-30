import type { ContentUrlState } from "@/features/edit-content-url";
import type { WorkEditorForm } from "./types";

export function workPublicationIssues(form: WorkEditorForm, url: ContentUrlState) {
    const required = [
        ["title", form.title, "Project title"],
        ["summary", form.summary, "Summary"],
        ["date", form.date, "Portfolio date"],
        ["slug", url.draftSlug, "URL"],
    ];
    if (form.hasCaseStudy)
        required.push(
            ["role", form.role, "Your role"],
            ["startedLabel", form.startedLabel, "Started"],
            ["shippedLabel", form.shippedLabel, "Target or shipped label"],
        );
    const issues = required
        .filter(([, value]) => !value.trim())
        .map(([field, , label]) => ({ field, message: `${label} is required for publication.` }));
    if (form.date && !/^\d{4}-\d{2}-\d{2}$/.test(form.date))
        issues.push({ field: "date", message: "Use a valid portfolio date." });
    return issues;
}
