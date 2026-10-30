import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AdminPostSummary } from "@portfolio/backend";
import { adminApi } from "@/shared/lib/admin-api";
import { usePostEditorController } from "./usePostEditorController";

afterEach(() => vi.restoreAllMocks());
const saved: AdminPostSummary = {
    slug: "untitled",
    draftSlug: "untitled",
    urlMode: "auto",
    hasUnpublishedChanges: false,
    title: { en: "", ru: "" },
    category: { en: "", ru: "" },
    excerpt: { en: "", ru: "" },
    date: "2026-10-29",
    readMins: 4,
    status: "upcoming",
    relatedWorkSlug: null,
    cover: null,
    hasBody: true,
    lifecycleState: "DRAFT",
    publishedAt: null,
    contentUpdatedAt: null,
    availableLocales: ["en"],
};

it("saves a body-only draft and exposes the created identity and newest saved reading time", async () => {
    let title: string | undefined;
    vi.spyOn(adminApi, "createPost").mockImplementation(async (input) => {
        title = input.title;
        return saved;
    });
    const { result } = renderHook(() => usePostEditorController());
    act(() => {
        result.current.blockEditorRef.current = { getBlocks: () => [{ type: "paragraph", text: "An idea" }] };
        result.current.bodyChanged();
    });
    await act(async () => result.current.flushDraft());
    expect(title).toBe("");
    expect(result.current.autosave.getResourceSlug()).toBe("untitled");
    expect(result.current.saved?.readMins).toBe(4);
    expect(result.current.autosave.isDirty).toBe(false);
});

it("clears a save error after recovery without replacing the body", async () => {
    vi.spyOn(adminApi, "createPost").mockRejectedValueOnce(new Error("offline")).mockResolvedValue(saved);
    const { result } = renderHook(() => usePostEditorController());
    act(() => result.current.update("title", "Hello"));
    await act(async () => {
        await result.current.flushDraft().catch(() => {});
    });
    expect(result.current.error).toBe("offline");
    await act(async () => result.current.flushDraft());
    expect(result.current.error).toBeNull();
    expect(result.current.contentVersion).toBe(0);
});

it("preserves loaded body content when metadata changes before the editor mounts", () => {
    const { result } = renderHook(() =>
        usePostEditorController({
            ...saved,
            blocks: [{ id: "body", order: 0, type: "paragraph", text: "Existing article" }],
        }),
    );
    act(() => result.current.update("title", "New title"));
    expect(result.current.buildInput().blocks).toMatchObject([{ type: "paragraph", text: "Existing article" }]);
});

it("adopts a published rename before the next autosave", async () => {
    vi.spyOn(adminApi, "publishPost").mockResolvedValue({
        ...saved,
        slug: "renamed",
        draftSlug: "renamed",
        urlMode: "manual",
        lifecycleState: "PUBLISHED",
        publishedAt: "2026-10-30T00:00:00.000Z",
    });
    const update = vi
        .spyOn(adminApi, "updatePost")
        .mockResolvedValue({ ...saved, slug: "renamed", draftSlug: "renamed", urlMode: "manual" });
    const { result } = renderHook(() => usePostEditorController({ ...saved, blocks: [] }));
    await act(() => result.current.publish());
    act(() => result.current.update("title", "Another title"));
    await act(() => result.current.flushDraft());
    expect(update).toHaveBeenCalledWith("renamed", expect.objectContaining({ slug: "renamed", urlMode: "manual" }));
});
