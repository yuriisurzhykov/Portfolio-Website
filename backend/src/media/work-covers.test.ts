import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { CURRENT_COVER_STYLE_VERSION } from "./cover-brief";
import { computeContentHash, resolveWorkHue } from "./covers";
import { ensureWorkCoverIsCurrent, generateCoverForWork, regenerateCoverForWork } from "./work-covers";
import { DiskMediaStore, setMediaStoreForTesting } from "./media-store";

const DATE = "2026-08-11";

beforeEach(async () => {
    await resetTestDatabase();
    // Same reasoning as `covers.test.ts`'s identical setup — a real but
    // throwaway per-test disk directory.
    setMediaStoreForTesting(new DiskMediaStore(path.join(os.tmpdir(), `work-covers-test-${ Date.now() }-${ Math.random() }`)));
});

afterEach(() => {
    setMediaStoreForTesting(undefined);
});

/** Minimal, published `Work` row a cover can be attached to — mirrors `work.test.ts`'s own `baseWorkData` fixture. */
async function createTestWork(slug: string) {
    return prisma.work.create({
        data: {
            slug,
            title: { en: slug, ru: "" },
            date: DATE,
            status: "shipped",
            summary: { en: "s", ru: "s" },
            stack: [],
            lifecycleState: "PUBLISHED",
        },
    });
}

describe("generateCoverForWork", () => {
    it("creates a persisted MediaAsset with work-cover kind and real WebP dimensions", async () => {
        await createTestWork("flowbus");
        const asset = await generateCoverForWork({
            slug: "flowbus",
            titleEn: "FlowBus",
            summaryEn: "A transit-tracking app.",
            date: DATE,
        });

        expect(asset.kind).toBe("work-cover");
        expect(asset.mimeType).toBe("image/webp");
        expect(asset.width).toBe(1200);
        expect(asset.height).toBe(630);
        expect(asset.placeholder.startsWith("data:image/webp;base64,")).toBe(true);
        expect(await prisma.mediaAsset.count()).toBe(1);
    });

    it("uses this Work's own resolveWorkHue, not a category-derived hue", async () => {
        await createTestWork("flowbus");
        const workHue = await resolveWorkHue("flowbus");

        const asset = await generateCoverForWork({
            slug: "flowbus",
            titleEn: "FlowBus",
            summaryEn: "A transit-tracking app.",
            date: DATE,
        });

        expect((asset.generation as { hue: number }).hue).toBeCloseTo(workHue);
    });

    it("is deterministic across processes: the same slug/title/summary/variant reproduces the exact same contentHash", async () => {
        await createTestWork("flowbus");
        const first = await generateCoverForWork({
            slug: "flowbus",
            titleEn: "FlowBus",
            summaryEn: "A transit-tracking app.",
            date: DATE,
        });
        const second = await generateCoverForWork({
            slug: "flowbus",
            titleEn: "FlowBus",
            summaryEn: "A transit-tracking app.",
            date: DATE,
        });

        expect(second.contentHash).toBe(first.contentHash);
        expect(second.id).toBe(first.id);
        expect(await prisma.mediaAsset.count()).toBe(1);
    });

    it("produces a different cover for a different variant of the same Work item", async () => {
        await createTestWork("flowbus");
        const variant1 = await generateCoverForWork({
            slug: "flowbus",
            titleEn: "FlowBus",
            summaryEn: "A transit-tracking app.",
            date: DATE,
            variant: 1,
        });
        const variant2 = await generateCoverForWork({
            slug: "flowbus",
            titleEn: "FlowBus",
            summaryEn: "A transit-tracking app.",
            date: DATE,
            variant: 2,
        });

        expect(variant2.contentHash).not.toBe(variant1.contentHash);
    });

    it("gives two different Work items two different, never-colliding hues", async () => {
        await createTestWork("project-a");
        await createTestWork("project-b");

        const first = await generateCoverForWork({ slug: "project-a", titleEn: "Project A", summaryEn: "", date: DATE });
        const second = await generateCoverForWork({ slug: "project-b", titleEn: "Project B", summaryEn: "", date: DATE });

        expect((first.generation as { hue: number }).hue).not.toBeCloseTo((second.generation as { hue: number }).hue);
        expect(second.contentHash).not.toBe(first.contentHash);
    });
});

describe("ensureWorkCoverIsCurrent", () => {
    it("regenerates when there is no existing cover at all", async () => {
        await createTestWork("flowbus");
        const workHue = await resolveWorkHue("flowbus");

        const assetId = await ensureWorkCoverIsCurrent(null, {
            slug: "flowbus",
            titleEn: "FlowBus",
            summaryEn: "",
            date: DATE,
        });

        const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
        expect((asset.generation as { hue: number }).hue).toBeCloseTo(workHue);
    });

    it("reuses the SAME cover when NOTHING relevant changed — no wasted regeneration on every publish", async () => {
        await createTestWork("stable-project");
        const first = await generateCoverForWork({
            slug: "stable-project",
            titleEn: "Stable Project",
            summaryEn: "An unchanging summary.",
            date: DATE,
        });

        const second = await ensureWorkCoverIsCurrent(first.id, {
            slug: "stable-project",
            titleEn: "Stable Project",
            summaryEn: "An unchanging summary.",
            date: DATE,
        });

        expect(second).toBe(first.id);
        expect(await prisma.mediaAsset.count()).toBe(1);
    });

    it("regenerates when the title changed — v3's title-driven layers would otherwise go stale", async () => {
        await createTestWork("retitled-project");
        const first = await generateCoverForWork({
            slug: "retitled-project",
            titleEn: "Original Title",
            summaryEn: "Original summary.",
            date: DATE,
        });

        const second = await ensureWorkCoverIsCurrent(first.id, {
            slug: "retitled-project",
            titleEn: "A Completely Different Title",
            summaryEn: "Original summary.",
            date: DATE,
        });

        expect(second).not.toBe(first.id);
        expect(await prisma.mediaAsset.count()).toBe(2);
    });

    it("regenerates when ONLY the date changed, title and summary unchanged — added after a PR review caught this: the stamp renders the date, so a date-only edit must not be treated as \"nothing relevant changed\"", async () => {
        await createTestWork("redated-project");
        const first = await generateCoverForWork({
            slug: "redated-project",
            titleEn: "Redated Project",
            summaryEn: "Unchanging summary.",
            date: "2024-01-01",
        });

        const second = await ensureWorkCoverIsCurrent(first.id, {
            slug: "redated-project",
            titleEn: "Redated Project",
            summaryEn: "Unchanging summary.",
            date: "2026-06-15",
        });

        expect(second).not.toBe(first.id);
        expect(await prisma.mediaAsset.count()).toBe(2);
    });

    it("regenerates a cover whose stored styleVersion is older than CURRENT_COVER_STYLE_VERSION, even with matching hue AND contentHash", async () => {
        await createTestWork("stale-style-version");
        const workHue = await resolveWorkHue("stale-style-version");
        // Same reasoning as `covers.test.ts`'s identical test — a crafted
        // row with a random, never-colliding storage `contentHash`, distinct
        // from the metadata `contentHash` inside `generation`, so the
        // upgrade this test triggers can't spuriously dedup back onto it.
        const staleRow = await prisma.mediaAsset.create({
            data: {
                contentHash: `stale-work-row-${ crypto.randomUUID() }`,
                storageKey: "covers/stale-work-row",
                mimeType: "image/webp",
                width: 1200,
                height: 630,
                byteSize: 1,
                placeholder: "data:image/webp;base64,",
                kind: "work-cover",
                generation: {
                    generator: "procedural",
                    styleVersion: CURRENT_COVER_STYLE_VERSION - 1,
                    variant: 1,
                    seed: "stale-style-version",
                    hue: workHue,
                    contentHash: computeContentHash("Same Title", "Same summary."),
                },
            },
        });

        const upgraded = await ensureWorkCoverIsCurrent(staleRow.id, {
            slug: "stale-style-version",
            titleEn: "Same Title",
            summaryEn: "Same summary.",
            date: DATE,
        });

        expect(upgraded).not.toBe(staleRow.id);
        const upgradedAsset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: upgraded } });
        expect((upgradedAsset.generation as { styleVersion: number }).styleVersion).toBe(CURRENT_COVER_STYLE_VERSION);
    });
});

describe("regenerateCoverForWork", () => {
    it("returns null for a slug that doesn't exist", async () => {
        expect(await regenerateCoverForWork("does-not-exist")).toBeNull();
    });

    it("reads the LIVE title/summary/date off the Work row, not a draft, and increments past the current cover's variant", async () => {
        await prisma.work.create({
            data: {
                slug: "with-cover",
                title: { en: "Live Title", ru: "" },
                date: DATE,
                status: "shipped",
                summary: { en: "Live summary", ru: "" },
                stack: [],
                lifecycleState: "PUBLISHED",
            },
        });
        const first = await generateCoverForWork({ slug: "with-cover", titleEn: "Live Title", summaryEn: "Live summary", date: DATE, variant: 1 });
        await prisma.work.update({ where: { slug: "with-cover" }, data: { coverAssetId: first.id } });

        const regenerated = await regenerateCoverForWork("with-cover");

        expect(regenerated).not.toBeNull();
        expect((regenerated!.generation as { variant: number }).variant).toBe(2);
        expect(regenerated!.contentHash).not.toBe(first.contentHash);
    });
});
