import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { coverUrlFor, ensureCoverMatchesCategory, generateCoverForPost, resolveCategoryHue } from "./covers";
import { hueForOrdinal } from "./cover-hue";
import { DiskMediaStore, setMediaStoreForTesting } from "./media-store";

beforeEach(async () => {
    await resetTestDatabase();
    // A real (but throwaway, per-test) disk directory rather than the
    // default `backend/media` — keeps generated files out of the repo
    // working tree during tests and gives each test a clean slate without
    // needing to know this module's internal env-var name.
    setMediaStoreForTesting(new DiskMediaStore(path.join(os.tmpdir(), `covers-test-${ Date.now() }-${ Math.random() }`)));
});

afterEach(() => {
    setMediaStoreForTesting(undefined);
});

describe("resolveCategoryHue", () => {
    it("assigns ordinal 0 (hue 0°) to the first category ever seen", async () => {
        expect(await resolveCategoryHue("Kotlin")).toBeCloseTo(hueForOrdinal(0));
    });

    it("assigns increasing ordinals to distinct new categories, in first-sight order", async () => {
        const first = await resolveCategoryHue("Kotlin");
        const second = await resolveCategoryHue("Architecture");
        const third = await resolveCategoryHue("Tooling");

        expect(first).toBeCloseTo(hueForOrdinal(0));
        expect(second).toBeCloseTo(hueForOrdinal(1));
        expect(third).toBeCloseTo(hueForOrdinal(2));
    });

    it("returns the SAME hue for the same category on a later call, without spending another ordinal", async () => {
        const first = await resolveCategoryHue("Kotlin");
        await resolveCategoryHue("Architecture");
        const kotlinAgain = await resolveCategoryHue("Kotlin");

        expect(kotlinAgain).toBe(first);
        expect(await prisma.categoryHue.count()).toBe(2);
    });

    it("normalizes case and surrounding whitespace to the SAME category row", async () => {
        const first = await resolveCategoryHue("Kotlin");
        const second = await resolveCategoryHue("  kotlin  ");

        expect(second).toBe(first);
        expect(await prisma.categoryHue.count()).toBe(1);
    });

    it("gives an empty category a fixed hue without spending an ordinal", async () => {
        const empty = await resolveCategoryHue("");
        await resolveCategoryHue("Kotlin");

        expect(empty).toBe(await resolveCategoryHue(""));
        expect(await prisma.categoryHue.count()).toBe(1); // only "Kotlin" persisted
    });

    it("persists the ordinal explicitly, not re-derivable from row count alone", async () => {
        await resolveCategoryHue("Kotlin");
        const row = await prisma.categoryHue.findUniqueOrThrow({ where: { category: "kotlin" } });
        expect(row.ordinal).toBe(0);
        expect(row.hue).toBeCloseTo(hueForOrdinal(0));
    });
});

describe("generateCoverForPost", () => {
    it("creates a persisted MediaAsset with post-cover kind and real WebP dimensions", async () => {
        const asset = await generateCoverForPost({
            slug: "my-first-post",
            titleEn: "My First Post",
            excerptEn: "An excerpt.",
            categoryEn: "Kotlin",
        });

        expect(asset.kind).toBe("post-cover");
        expect(asset.mimeType).toBe("image/webp");
        expect(asset.width).toBe(1200);
        expect(asset.height).toBe(630);
        expect(asset.placeholder.startsWith("data:image/webp;base64,")).toBe(true);
        expect(await prisma.mediaAsset.count()).toBe(1);
    });

    it("is deterministic across processes: the same slug/category/variant reproduces the exact same contentHash", async () => {
        const first = await generateCoverForPost({
            slug: "flowbus",
            titleEn: "FlowBus",
            excerptEn: "Why I built it.",
            categoryEn: "Architecture",
        });

        // Simulates "regenerate after a restart" — a brand-new PRNG/sharp
        // pipeline run, not a cached in-memory value.
        const second = await generateCoverForPost({
            slug: "flowbus",
            titleEn: "FlowBus",
            excerptEn: "Why I built it.",
            categoryEn: "Architecture",
        });

        expect(second.contentHash).toBe(first.contentHash);
        // Reused the existing row rather than writing a duplicate — the
        // whole point of content-addressed dedup (see this module's own
        // comment on `generateCoverForPost`).
        expect(second.id).toBe(first.id);
        expect(await prisma.mediaAsset.count()).toBe(1);
    });

    it("produces a different cover for a different variant of the same post", async () => {
        const variant1 = await generateCoverForPost({
            slug: "flowbus",
            titleEn: "FlowBus",
            excerptEn: "Why I built it.",
            categoryEn: "Architecture",
            variant: 1,
        });
        const variant2 = await generateCoverForPost({
            slug: "flowbus",
            titleEn: "FlowBus",
            excerptEn: "Why I built it.",
            categoryEn: "Architecture",
            variant: 2,
        });

        expect(variant2.contentHash).not.toBe(variant1.contentHash);
    });

    it("gives two posts in the SAME category covers from the same hue family, but never byte-identical", async () => {
        const first = await generateCoverForPost({
            slug: "post-a",
            titleEn: "Post A",
            excerptEn: "",
            categoryEn: "Kotlin",
        });
        const second = await generateCoverForPost({
            slug: "post-b",
            titleEn: "Post B",
            excerptEn: "",
            categoryEn: "Kotlin",
        });

        expect(second.contentHash).not.toBe(first.contentHash);
        const category = await prisma.categoryHue.findUniqueOrThrow({ where: { category: "kotlin" } });
        expect((first.generation as { hue: number }).hue).toBeCloseTo(category.hue);
        expect((second.generation as { hue: number }).hue).toBeCloseTo(category.hue);
    });
});

describe("ensureCoverMatchesCategory", () => {
    it("regenerates when there is no existing cover at all", async () => {
        const assetId = await ensureCoverMatchesCategory(null, {
            slug: "no-cover-yet",
            titleEn: "No Cover Yet",
            excerptEn: "",
            categoryEn: "Kotlin",
        });

        const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
        const category = await prisma.categoryHue.findUniqueOrThrow({ where: { category: "kotlin" } });
        expect((asset.generation as { hue: number }).hue).toBeCloseTo(category.hue);
    });

    it("reuses the SAME cover when the category hasn't changed — the fix's whole point: no wasted regeneration on every autosave tick", async () => {
        const first = await generateCoverForPost({
            slug: "stable-category",
            titleEn: "Stable Category",
            excerptEn: "",
            categoryEn: "Kotlin",
        });

        const second = await ensureCoverMatchesCategory(first.id, {
            slug: "stable-category",
            titleEn: "Stable Category (edited title)",
            excerptEn: "An excerpt added later.",
            categoryEn: "Kotlin",
        });

        expect(second).toBe(first.id);
        expect(await prisma.mediaAsset.count()).toBe(1);
    });

    it("regenerates when the category actually changed — the real bug this exists to fix: a post created before its category was ever typed", async () => {
        // Mirrors the real admin flow: the very first autosave fires the
        // moment the title stops being empty, almost always BEFORE the
        // admin has typed a category — `createPost` (admin-posts.ts) is
        // exactly this call, with an empty category.
        const uncategorized = await generateCoverForPost({
            slug: "post-in-progress",
            titleEn: "Post In Progress",
            excerptEn: "",
            categoryEn: "",
        });

        // The admin then types the real category — the NEXT autosave
        // (`savePostDraft`) must correct the cover, not leave it frozen.
        const corrected = await ensureCoverMatchesCategory(uncategorized.id, {
            slug: "post-in-progress",
            titleEn: "Post In Progress",
            excerptEn: "",
            categoryEn: "Architecture",
        });

        expect(corrected).not.toBe(uncategorized.id);
        const correctedAsset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: corrected } });
        const category = await prisma.categoryHue.findUniqueOrThrow({ where: { category: "architecture" } });
        expect((correctedAsset.generation as { hue: number }).hue).toBeCloseTo(category.hue);
    });
});

describe("coverUrlFor", () => {
    it("returns null for a null/undefined asset", () => {
        expect(coverUrlFor(null)).toBeNull();
        expect(coverUrlFor(undefined)).toBeNull();
    });

    it("builds distinct full/narrow URLs and carries the placeholder through", async () => {
        const asset = await generateCoverForPost({
            slug: "url-check",
            titleEn: "URL check",
            excerptEn: "",
            categoryEn: "Kotlin",
        });

        const cover = coverUrlFor(asset);
        expect(cover).not.toBeNull();
        expect(cover!.src).toContain("1200.webp");
        expect(cover!.srcNarrow).toContain("640.webp");
        expect(cover!.src).not.toBe(cover!.srcNarrow);
        expect(cover!.placeholder).toBe(asset.placeholder);
        expect(cover!.width).toBe(1200);
        expect(cover!.height).toBe(630);
    });
});
