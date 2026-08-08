import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { getSiteContent, isSiteContentKey, SITE_CONTENT_KEYS, updateSiteContent } from "./site-content";
import { SITE_CONTENT_DEFAULTS } from "./site-content-defaults";

beforeEach(async () => {
    await resetTestDatabase();
});

describe("getSiteContent", () => {
    it("falls back to SITE_CONTENT_DEFAULTS when no row exists yet", async () => {
        const contact = await getSiteContent("contact");
        expect(contact).toEqual(SITE_CONTENT_DEFAULTS.contact);
    });

    it("reads a customized row once one has been written", async () => {
        await prisma.siteContent.create({
            data: { key: "contact", data: { heading: { en: "Hi", ru: "Привет" }, description: { en: "d", ru: "d" } } },
        });

        const contact = await getSiteContent("contact");
        expect(contact.heading.en).toBe("Hi");
    });

    it("validates every default against its own schema (catches defaults/schema drift)", async () => {
        for (const key of SITE_CONTENT_KEYS) {
            await expect(getSiteContent(key)).resolves.toBeDefined();
        }
    });
});

describe("updateSiteContent", () => {
    it("creates a row when none exists (upsert), and it's readable back through getSiteContent", async () => {
        const written = await updateSiteContent("journalPage", {
            heading: { en: "New heading", ru: "Новый заголовок" },
            description: { en: "d", ru: "d" },
        });
        expect(written.heading.en).toBe("New heading");

        const read = await getSiteContent("journalPage");
        expect(read).toEqual(written);
    });

    it("overwrites an existing row rather than erroring on a duplicate key", async () => {
        await updateSiteContent("journalPage", { heading: { en: "First", ru: "" }, description: { en: "d", ru: "" } });
        await updateSiteContent("journalPage", { heading: { en: "Second", ru: "" }, description: { en: "d", ru: "" } });

        const read = await getSiteContent("journalPage");
        expect(read.heading.en).toBe("Second");

        const rows = await prisma.siteContent.findMany({ where: { key: "journalPage" } });
        expect(rows).toHaveLength(1);
    });

    it("rejects data that doesn't match the key's schema", async () => {
        // @ts-expect-error deliberately wrong shape for this key, to prove `.parse()` actually runs
        await expect(updateSiteContent("contact", { notAField: true })).rejects.toThrow();
    });

    it("round-trips a tech-stack row's icon (auto, brand, url, svg, none variants) through updateSiteContent/getSiteContent", async () => {
        const written = await updateSiteContent("techStack", [
            { name: "Kotlin", note: { en: "n", ru: "n" }, icon: { type: "auto" } },
            { name: "Docker", note: { en: "n", ru: "n" }, icon: { type: "brand", value: "docker" } },
            { name: "Custom", note: { en: "n", ru: "n" }, icon: { type: "url", value: "https://example.com/icon.svg" } },
            { name: "Coroutines & Flow", note: { en: "n", ru: "n" }, icon: { type: "svg", value: "<svg><path d=\"M0 0\"/></svg>" } },
            { name: "Hidden", note: { en: "n", ru: "n" }, icon: { type: "none" } },
        ]);
        expect(written.map((item) => item.icon)).toEqual([
            { type: "auto" },
            { type: "brand", value: "docker" },
            { type: "url", value: "https://example.com/icon.svg" },
            { type: "svg", value: "<svg><path d=\"M0 0\"/></svg>" },
            { type: "none" },
        ]);

        const read = await getSiteContent("techStack");
        expect(read).toEqual(written);
    });

    it("stores 'svg' icon markup raw, without stripping a <script> tag at write time (sanitization happens only at render, in frontend/shared/lib/sanitize-svg.ts)", async () => {
        // This is a deliberate assertion, not an oversight: proves the
        // backend never silently mutates/sanitizes the stored value, so a
        // future stricter sanitizer rule applies to every already-saved
        // row at render time, not just newly-saved ones.
        const malicious = "<svg><script>alert(1)</script></svg>";
        const written = await updateSiteContent("techStack", [
            { name: "Test", note: { en: "n", ru: "n" }, icon: { type: "svg", value: malicious } },
        ]);
        expect(written[0].icon).toEqual({ type: "svg", value: malicious });
    });

    it("round-trips a principle's icon (url and icon variants) through updateSiteContent/getSiteContent", async () => {
        const written = await updateSiteContent("principles", [
            {
                title: { en: "Title", ru: "Заголовок" },
                description: { en: "Desc", ru: "Описание" },
                icon: { type: "url", value: "https://example.com/icon.svg" },
            },
            {
                title: { en: "Title 2", ru: "Заголовок 2" },
                description: { en: "Desc 2", ru: "Описание 2" },
                icon: { type: "icon", value: "rocket" },
            },
        ]);
        expect(written[0].icon).toEqual({ type: "url", value: "https://example.com/icon.svg" });
        expect(written[1].icon).toEqual({ type: "icon", value: "rocket" });

        const read = await getSiteContent("principles");
        expect(read).toEqual(written);
    });
});

describe("principles icon default", () => {
    it("falls back to `{ type: 'none' }` for a principle whose stored JSON predates the `icon` field entirely", async () => {
        // Simulates a row written before `icon` existed on the schema —
        // written directly via `prisma`, bypassing `updateSiteContent`'s
        // own `.parse()`, the same way a genuinely pre-existing production
        // row would have no `icon` key at all.
        await prisma.siteContent.create({
            data: {
                key: "principles",
                data: [{ title: { en: "Legacy", ru: "Старое" }, description: { en: "d", ru: "d" } }],
            },
        });

        const principles = await getSiteContent("principles");
        expect(principles[0].icon).toEqual({ type: "none" });
    });
});

describe("techStack icon default", () => {
    it("falls back to `{ type: 'auto' }` for a row whose stored JSON predates the `icon` field entirely", async () => {
        await prisma.siteContent.create({
            data: {
                key: "techStack",
                data: [{ name: "Legacy Tech", note: { en: "d", ru: "d" } }],
            },
        });

        const techStack = await getSiteContent("techStack");
        expect(techStack[0].icon).toEqual({ type: "auto" });
    });
});

describe("isSiteContentKey", () => {
    it("accepts every known key and rejects an unknown one", () => {
        for (const key of SITE_CONTENT_KEYS) {
            expect(isSiteContentKey(key)).toBe(true);
        }
        expect(isSiteContentKey("notARealKey")).toBe(false);
    });
});
