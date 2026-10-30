import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { createPost, getPostForAdmin, postDraftInputSchema, publishPost, savePostDraft, unpublishPost } from "./admin-posts";
import { createWork, getWorkDetailForAdmin, workDraftInputSchema, saveWorkDraft } from "./admin-work";

beforeEach(resetTestDatabase);

describe("body-first drafts and URL policy", () => {
    it("persists Journal body without a title while still rejecting publication", async () => {
        const created = await createPost(postDraftInputSchema.parse({ title: "", blocks: [{ type: "paragraph", text: "An unsent idea" }], urlMode: "auto" }));
        expect(created.slug).toBe("untitled");
        expect((await getPostForAdmin(created.slug))?.blocks[0]).toMatchObject({ type: "paragraph", text: "An unsent idea" });
        await expect(publishPost(created.slug)).rejects.toThrow();
    });
    it("continues generating a candidate after creation and reload, then freezes after publication and unpublish", async () => {
        const created = await createPost(postDraftInputSchema.parse({ title: "First title", category: "Notes", excerpt: "Teaser", urlMode: "auto" }));
        await savePostDraft(created.slug, postDraftInputSchema.parse({ title: "Second title", category: "Notes", excerpt: "Teaser", urlMode: "auto" }));
        const reloaded = await getPostForAdmin(created.slug);
        expect(reloaded?.draftSlug).toBe("second-title");
        expect(reloaded?.urlMode).toBe("auto");
        const published = await publishPost(created.slug);
        expect(published?.slug).toBe("second-title");
        await unpublishPost("second-title");
        await savePostDraft("second-title", postDraftInputSchema.parse({ title: "Third title", urlMode: "auto" }));
        expect((await getPostForAdmin("second-title"))?.draftSlug).toBe("second-title");
    });
    it("preserves an explicit manual candidate through later title edits and reload", async () => {
        const created = await createPost(postDraftInputSchema.parse({ title: "Original", urlMode: "auto" }));
        await savePostDraft(created.slug, postDraftInputSchema.parse({ title: "Original", slug: "custom-address", urlMode: "manual" }));
        await savePostDraft(created.slug, postDraftInputSchema.parse({ title: "Changed", urlMode: "manual" }));
        const reloaded = await getPostForAdmin(created.slug);
        expect(reloaded?.draftSlug).toBe("custom-address");
        expect(reloaded?.urlMode).toBe("manual");
    });
    it("resolves automatic candidate collisions without changing the canonical draft identity", async () => {
        await createPost(postDraftInputSchema.parse({ title: "Taken" }));
        const created = await createPost(postDraftInputSchema.parse({ title: "Initial", urlMode: "auto" }));
        const saved = await savePostDraft(created.slug, postDraftInputSchema.parse({ title: "Taken", urlMode: "auto" }));
        expect(saved?.slug).toBe("initial");
        expect(saved?.draftSlug).toBe("taken-2");
    });
    it("applies the same persistent policy and body-only draft acceptance to Work", async () => {
        const created = await createWork(workDraftInputSchema.parse({ title: "", urlMode: "auto", caseStudy: { blocks: [{ type: "paragraph", text: "Project notes" }] } }));
        await saveWorkDraft(created.slug, workDraftInputSchema.parse({ title: "Camera Runtime", urlMode: "auto", caseStudy: { blocks: [{ type: "paragraph", text: "Project notes" }] } }));
        const reloaded = await getWorkDetailForAdmin(created.slug);
        expect(reloaded?.draftSlug).toBe("camera-runtime");
        expect(reloaded?.caseStudy?.blocks[0]).toMatchObject({ type: "paragraph", text: "Project notes" });
        expect(reloaded?.urlMode).toBe("auto");
    });
});
