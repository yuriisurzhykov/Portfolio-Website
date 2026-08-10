import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import {
    type ContentChange,
    type ContentChangeNotifier,
    setContentChangeNotifier,
} from "./content-change-notifier";
import { createPost, deletePost, publishPost, savePostDraft, translatePost, unpublishPost, type PostInput } from "./admin-posts";
import { createWork, deleteWork, publishWork, saveWorkDraft, translateWork, unpublishWork, type WorkInput } from "./admin-work";

/**
 * The check that is impossible to write when the "tell search engines"
 * policy lives in route handlers: whether the use case remembered to
 * announce at all. A fake notifier, no network.
 */
const captured: ContentChange[] = [];
const fake: ContentChangeNotifier = { contentChanged: (change) => void captured.push(change) };

const postInput: PostInput = {
    slug: "a-post",
    title: "A Post",
    category: "Notes",
    excerpt: "An excerpt.",
    status: "published",
    relatedWorkSlug: null,
    blocks: [{ type: "lead", text: "Lead." }],
};

const workInput: WorkInput = {
    slug: "a-project",
    title: "A Project",
    year: 2026,
    status: "shipped",
    summary: "A summary.",
    stack: ["Kotlin"],
    coverImage: null,
    featured: false,
    relatedPostSlug: null,
    caseStudy: {
        startedLabel: "Jan 2026",
        shippedLabel: "Mar 2026",
        role: "Sole engineer",
        heroImage: null,
        blocks: [{ type: "lead" as const, text: "Lead." }],
    },
};

beforeEach(async () => {
    await resetTestDatabase();
    captured.length = 0;
    setContentChangeNotifier(fake);
});

afterEach(() => {
    setContentChangeNotifier(null);
    vi.restoreAllMocks();
});

describe("post lifecycle events", () => {
    it("publishPost announces a now-public post", async () => {
        await createPost(postInput);
        captured.length = 0;

        await publishPost("a-post");

        expect(captured).toEqual([
            { kind: "post", slug: "a-post", previousSlug: null, isPublic: true, availableLocales: ["en"] },
        ]);
    });

    it("savePostDraft on a PUBLISHED post announces NOTHING — a draft has no public address of its own yet", async () => {
        await createPost(postInput);
        await publishPost("a-post");
        captured.length = 0;

        await savePostDraft("a-post", { ...postInput, excerpt: "A better excerpt." });

        expect(captured).toEqual([]);
    });

    it("publishPost applying a pending draft edit (the Update button) announces the change", async () => {
        await createPost(postInput);
        await publishPost("a-post");
        await savePostDraft("a-post", { ...postInput, excerpt: "A better excerpt." });
        captured.length = 0;

        await publishPost("a-post");

        expect(captured).toEqual([
            { kind: "post", slug: "a-post", previousSlug: null, isPublic: true, availableLocales: ["en"] },
        ]);
    });

    it("a RENAME carries both the new slug and the previous one — only once the pending rename is actually PUBLISHED", async () => {
        // Without `previousSlug` the old address keeps 404ing while still
        // sitting in Bing's index. The use case knows the old slug because
        // it read the row before writing — this is why the public return
        // type of `publishPost` did not need to grow a field.
        await createPost(postInput);
        await publishPost("a-post");
        await savePostDraft("a-post", { ...postInput, slug: "a-renamed-post" });
        captured.length = 0;

        await publishPost("a-post");

        expect(captured).toEqual([
            { kind: "post", slug: "a-renamed-post", previousSlug: "a-post", isPublic: true, availableLocales: ["en"] },
        ]);
    });

    it("translatePost announces NOTHING — the translation is only a pending draft until Publish/Update", async () => {
        await createPost(postInput);
        await publishPost("a-post");
        captured.length = 0;

        await translatePost("a-post", { title: "Пост", category: "Заметки", excerpt: "Отрывок.", blocks: [{ type: "lead", text: "Лид." }] });

        expect(captured).toEqual([]);
    });

    it("publishPost applying a pending translation reports both locales", async () => {
        await createPost(postInput);
        await publishPost("a-post");
        await translatePost("a-post", { title: "Пост", category: "Заметки", excerpt: "Отрывок.", blocks: [{ type: "lead", text: "Лид." }] });
        captured.length = 0;

        await publishPost("a-post");

        expect(captured).toEqual([
            { kind: "post", slug: "a-post", previousSlug: null, isPublic: true, availableLocales: ["en", "ru"] },
        ]);
    });

    it("unpublishPost announces that the address is gone", async () => {
        await createPost(postInput);
        await publishPost("a-post");
        captured.length = 0;

        await unpublishPost("a-post");

        expect(captured).toEqual([
            { kind: "post", slug: "a-post", previousSlug: null, isPublic: false, availableLocales: ["en"] },
        ]);
    });

    it("deletePost announces the same thing, in its strong form", async () => {
        await createPost(postInput);
        await publishPost("a-post");
        captured.length = 0;

        await deletePost("a-post");

        expect(captured).toEqual([
            { kind: "post", slug: "a-post", previousSlug: null, isPublic: false, availableLocales: ["en"] },
        ]);
    });

    it("createPost announces nothing — a draft has no public address", async () => {
        await createPost(postInput);
        expect(captured).toEqual([]);
    });

    it("editing a DRAFT (never published) announces nothing, so autosave can't become a stream of pings", async () => {
        await createPost(postInput);
        captured.length = 0;

        await savePostDraft("a-post", { ...postInput, excerpt: "Still drafting." });

        expect(captured).toEqual([]);
    });
});

describe("work lifecycle events", () => {
    it("publishWork announces a now-public case study", async () => {
        await createWork(workInput);
        captured.length = 0;

        await publishWork("a-project");

        expect(captured).toEqual([
            { kind: "work", slug: "a-project", previousSlug: null, isPublic: true, availableLocales: ["en"] },
        ]);
    });

    it("saveWorkDraft on a PUBLISHED item announces nothing", async () => {
        await createWork(workInput);
        await publishWork("a-project");
        captured.length = 0;

        await saveWorkDraft("a-project", { ...workInput, summary: "A better summary." });

        expect(captured).toEqual([]);
    });

    it("unpublishWork announces that the address is gone", async () => {
        await createWork(workInput);
        await publishWork("a-project");
        captured.length = 0;

        await unpublishWork("a-project");

        expect(captured).toEqual([
            { kind: "work", slug: "a-project", previousSlug: null, isPublic: false, availableLocales: ["en"] },
        ]);
    });

    it("translateWork announces nothing until the pending translation is published", async () => {
        await createWork(workInput);
        await publishWork("a-project");
        captured.length = 0;

        await translateWork("a-project", {
            summary: "Сводка.",
            startedLabel: "Янв 2026",
            shippedLabel: "Мар 2026",
            role: "Единственный разработчик",
            blocks: [{ type: "lead", text: "Лид." }],
        });
        expect(captured).toEqual([]);

        await publishWork("a-project");
        expect(captured).toEqual([
            { kind: "work", slug: "a-project", previousSlug: null, isPublic: true, availableLocales: ["en", "ru"] },
        ]);
    });

    it("deleteWork announces before the row is gone for good", async () => {
        await createWork(workInput);
        await publishWork("a-project");
        captured.length = 0;

        await deleteWork("a-project");

        expect(captured).toEqual([
            { kind: "work", slug: "a-project", previousSlug: null, isPublic: false, availableLocales: ["en"] },
        ]);
    });
});

describe("notifier isolation", () => {
    it("a notifier that throws cannot fail the publish it was told about, but is reported", async () => {
        // Contained, not silenced: an adapter throwing on every call would
        // otherwise mean nothing is ever announced, with nothing anywhere
        // to say so.
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        setContentChangeNotifier({
            contentChanged: () => {
                throw new Error("adapter is broken");
            },
        });
        await createPost(postInput);

        await expect(publishPost("a-post")).resolves.toMatchObject({ lifecycleState: "PUBLISHED" });
        expect(await prisma.post.findUnique({ where: { slug: "a-post" } })).toMatchObject({ lifecycleState: "PUBLISHED" });
        expect(logged).toHaveBeenCalledOnce();
        expect(String(logged.mock.calls[0][0])).toContain("a-post");
    });

    it("resets to a no-op, so a consumer that never registers behaves as before", async () => {
        setContentChangeNotifier(null);
        await createPost(postInput);

        await expect(publishPost("a-post")).resolves.not.toBeNull();
        expect(captured).toEqual([]);
    });
});
