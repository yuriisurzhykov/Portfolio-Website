import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db/client";
import { DiskMediaStore, setMediaStoreForTesting } from "../media/media-store";
import { resetTestDatabase } from "../test-utils/db";
import { pngFromIco } from "./link-images";
import { getLinkPreviews, getLinkPreviewsForBlocks, refreshLinkPreviews, setLinkFetchOptionsForTesting } from "./link-previews";
import { LOCAL_FETCH, startTestServer } from "./test-server";

let server: Awaited<ReturnType<typeof startTestServer>>;
let articleUp = true;
let articleHits = 0;
let png: Buffer;

beforeAll(async () => {
    png = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#f97c3e" } }).png().toBuffer();
    server = await startTestServer((request, response) => {
        switch (request.url) {
            case "/article":
                articleHits++;
                if (!articleUp) {
                    response.writeHead(503);
                    response.end();
                    return;
                }
                response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                response.end(`<html><head>
                    <meta property="og:title" content="Coroutines guide">
                    <meta property="og:description" content="Kotlin coroutines, explained">
                    <meta property="og:site_name" content="Kotlin">
                    <meta property="og:image" content="/card.png">
                    <link rel="icon" href="/icon.png">
                </head><body></body></html>`);
                return;
            case "/plain":
                response.writeHead(200, { "Content-Type": "text/html" });
                response.end("<head><title>Just a title</title><link rel=icon href=/evil.svg></head>");
                return;
            case "/card.png":
            case "/icon.png":
                response.writeHead(200, { "Content-Type": "image/png" });
                response.end(png);
                return;
            case "/favicon.ico":
            case "/evil.svg":
                response.writeHead(200, { "Content-Type": "image/svg+xml" });
                response.end('<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///etc/passwd"/></svg>');
                return;
            case "/json":
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end("{}");
                return;
            default:
                response.writeHead(404);
                response.end();
        }
    });
});

afterAll(async () => {
    await server.close();
});

beforeEach(async () => {
    await resetTestDatabase();
    articleUp = true;
    articleHits = 0;
    setMediaStoreForTesting(new DiskMediaStore(path.join(os.tmpdir(), `link-preview-test-${ Date.now() }-${ Math.random() }`)));
    setLinkFetchOptionsForTesting(LOCAL_FETCH);
});

afterEach(() => {
    setMediaStoreForTesting(undefined);
    setLinkFetchOptionsForTesting(undefined);
});

describe("refreshLinkPreviews + getLinkPreviews", () => {
    it("fetches metadata, re-hosts the image and favicon, and serves them from /media", async () => {
        const url = `${ server.origin }/article#intro`;
        await refreshLinkPreviews([url]);

        const preview = (await getLinkPreviews([url]))[url];
        expect(preview).toMatchObject({
            url,
            kind: "external",
            title: "Coroutines guide",
            description: "Kotlin coroutines, explained",
            siteName: "Kotlin",
            domain: "127.0.0.1",
            status: "ok",
            lastError: null,
        });
        expect(preview.image?.src).toMatch(/^\/media\/links\/[0-9a-f]{64}\.webp$/);
        expect(preview.image).toMatchObject({ width: 1200, height: 630 });
        expect(preview.image?.placeholder).toMatch(/^data:image\/webp;base64,/);
        expect(preview.faviconUrl).toMatch(/^\/media\/links\/[0-9a-f]{64}\.png$/);

        const assets = await prisma.mediaAsset.findMany({ orderBy: { kind: "asc" } });
        expect(assets.map((asset) => asset.kind)).toEqual(["link-favicon", "link-image"]);
    });

    it("never rasterizes SVG — the icon is simply absent", async () => {
        const url = `${ server.origin }/plain`;
        await refreshLinkPreviews([url]);
        const preview = (await getLinkPreviews([url]))[url];
        expect(preview.title).toBe("Just a title");
        expect(preview.faviconUrl).toBeNull();
        expect(preview.image).toBeNull();
    });

    it("does not refetch a fresh snapshot, but does with force", async () => {
        const url = `${ server.origin }/article`;
        await refreshLinkPreviews([url]);
        await refreshLinkPreviews([url, `${ url }?utm_source=newsletter`]);
        expect(articleHits).toBe(1);

        await refreshLinkPreviews([url], { force: true });
        expect(articleHits).toBe(2);
    });

    it("keeps the last good snapshot when the site later fails, and records why", async () => {
        const url = `${ server.origin }/article`;
        await refreshLinkPreviews([url]);
        articleUp = false;
        await refreshLinkPreviews([url], { force: true });

        const publicView = (await getLinkPreviews([url]))[url];
        expect(publicView).toMatchObject({ title: "Coroutines guide", status: "failed", lastError: null });
        const adminView = (await getLinkPreviews([url], "en", { includeErrors: true }))[url];
        expect(adminView.lastError).toBe("The site answered with HTTP 503.");
    });

    it("a link that never produced a preview is absent for readers, visible (with its error) for the admin", async () => {
        const url = `${ server.origin }/json`;
        await refreshLinkPreviews([url]);
        expect(await getLinkPreviews([url])).toEqual({});
        expect((await getLinkPreviews([url], "en", { includeErrors: true }))[url]).toMatchObject({ title: null, status: "failed", lastError: "The link is not an HTML page." });
    });

    it("with the production network rules, a loopback URL is refused and recorded, never fetched", async () => {
        setLinkFetchOptionsForTesting(undefined);
        const url = `${ server.origin }/article`;
        await refreshLinkPreviews([url], { force: true });
        expect(articleHits).toBe(0);
        const row = await prisma.linkPreview.findFirstOrThrow();
        expect(row.lastError).toMatch(/standard web ports|private or reserved/);
    });
});

describe("own Work/Post links", () => {
    it("are resolved from the database in the requested locale, published only, never fetched", async () => {
        await prisma.work.create({
            data: {
                slug: "design-tokens", title: { en: "Design Tokens", ru: "Дизайн-токены" }, date: "2026-01-01", status: "shipped",
                summary: { en: "Token compiler", ru: "Компилятор токенов" }, stack: ["TypeScript"], lifecycleState: "PUBLISHED",
            },
        });
        await prisma.identityHue.create({ data: { kind: "work", key: "design-tokens", hue: 255, ordinal: 0 } });
        await prisma.post.create({
            data: {
                slug: "secret-draft", date: "2026-01-01", title: { en: "Draft", ru: "" }, category: { en: "a", ru: "" },
                readMins: 1, excerpt: { en: "x", ru: "" }, status: "published", lifecycleState: "DRAFT",
            },
        });

        await refreshLinkPreviews(["/work/design-tokens"]);
        expect(await prisma.linkPreview.count()).toBe(0);

        const previews = await getLinkPreviews(["/ru/work/design-tokens", "/journal/secret-draft"], "ru");
        expect(previews["/ru/work/design-tokens"]).toMatchObject({ kind: "work", title: "Дизайн-токены", description: "Компилятор токенов", hue: 255 });
        expect(previews["/journal/secret-draft"]).toBeUndefined();
    });
});

describe("getLinkPreviewsForBlocks", () => {
    it("looks up every link a document uses", async () => {
        const url = `${ server.origin }/article`;
        await refreshLinkPreviews([url]);
        const previews = await getLinkPreviewsForBlocks([
            { id: "b1", order: 0, type: "paragraph", text: `See [the guide](${ url } "smart").` },
            { id: "b2", order: 1, type: "paragraph", text: "No links here." },
        ]);
        expect(Object.keys(previews)).toEqual([url]);
    });

    it("costs nothing for a document with no smart links", async () => {
        expect(await getLinkPreviewsForBlocks([{ id: "b1", order: 0, type: "paragraph", text: "[plain](https://x.dev)" }])).toEqual({});
    });
});

describe("pngFromIco", () => {
    it("pulls the largest embedded PNG frame out of an ICO container", () => {
        const small = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from("small")]);
        const large = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from("large!")]);
        const header = Buffer.alloc(6 + 32);
        header.writeUInt16LE(0, 0);
        header.writeUInt16LE(1, 2);
        header.writeUInt16LE(2, 4);
        const entry = (index: number, width: number, data: Buffer, offset: number) => {
            const at = 6 + index * 16;
            header[at] = width;
            header.writeUInt32LE(data.length, at + 8);
            header.writeUInt32LE(offset, at + 12);
        };
        entry(0, 16, small, 38);
        entry(1, 32, large, 38 + small.length);
        expect(pngFromIco(Buffer.concat([header, small, large]))).toEqual(large);
    });

    it("returns null for anything that isn't an ICO", () => {
        expect(pngFromIco(Buffer.from("GIF89a"))).toBeNull();
    });
});
