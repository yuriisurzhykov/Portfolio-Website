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
});

describe("isSiteContentKey", () => {
    it("accepts every known key and rejects an unknown one", () => {
        for (const key of SITE_CONTENT_KEYS) {
            expect(isSiteContentKey(key)).toBe(true);
        }
        expect(isSiteContentKey("notARealKey")).toBe(false);
    });
});
