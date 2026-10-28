import { describe, expect, it } from "vitest";
import { decodeEntities, decodeHtml, extractMetadata } from "./extract-metadata";

const PAGE = "https://github.com/yuriisurzhykov/Portfolio-Website";

describe("extractMetadata", () => {
    it("prefers OpenGraph and resolves relative URLs against the page", () => {
        const html = `<!doctype html><html><head>
            <title>Fallback title</title>
            <meta name="description" content="Fallback description">
            <meta property="og:title" content="yuriisurzhykov/Portfolio-Website">
            <meta property="og:description" content="A full stack personal portfolio &amp; more">
            <meta property="og:site_name" content="GitHub">
            <meta property="og:image" content="/og/card.png">
            <link rel="icon" href="/favicon-16.png" sizes="16x16">
            <link rel="icon" href="https://cdn.example/icon-192.png" sizes="192x192">
        </head><body><meta property="og:title" content="ignored, after head"></body></html>`;

        expect(extractMetadata(html, PAGE)).toEqual({
            title: "yuriisurzhykov/Portfolio-Website",
            description: "A full stack personal portfolio & more",
            siteName: "GitHub",
            imageUrl: "https://github.com/og/card.png",
            faviconUrl: "https://cdn.example/icon-192.png",
        });
    });

    it("falls back to Twitter cards, then <title>/<meta name=description>, then /favicon.ico", () => {
        const html = "<head><TITLE>  Plain\n  title </TITLE><meta content='Plain description' name='description'></head>";
        expect(extractMetadata(html, "https://plain.dev/a/b")).toEqual({
            title: "Plain title",
            description: "Plain description",
            siteName: null,
            imageUrl: null,
            faviconUrl: "https://plain.dev/favicon.ico",
        });
        expect(extractMetadata('<meta name="twitter:title" content="Tw">', PAGE).title).toBe("Tw");
    });

    it("never returns a javascript: or data: image URL", () => {
        const html = '<meta property="og:image" content="javascript:alert(1)"><link rel="icon" href="data:image/png;base64,AAA">';
        const metadata = extractMetadata(html, PAGE);
        expect(metadata.imageUrl).toBeNull();
        expect(metadata.faviconUrl).toBeNull();
    });

    it("skips SVG icons in favour of a raster one", () => {
        const html = '<link rel="icon" type="image/svg+xml" href="/icon.svg"><link rel="icon" href="/icon.png">';
        expect(extractMetadata(html, PAGE).faviconUrl).toBe("https://github.com/icon.png");
    });

    it("truncates very long text and keeps markup as text", () => {
        const html = `<meta property="og:title" content="${ "x".repeat(500) }"><meta property="og:description" content="&lt;script&gt;alert(1)&lt;/script&gt;">`;
        const metadata = extractMetadata(html, PAGE);
        expect(metadata.title).toHaveLength(200);
        expect(metadata.title?.endsWith("…")).toBe(true);
        expect(metadata.description).toBe("<script>alert(1)</script>");
    });
});

describe("decodeEntities", () => {
    it("decodes numeric and common named references, leaves unknown ones", () => {
        expect(decodeEntities("&#x41;&#66; &laquo;Q&raquo; &bogus;")).toBe("AB «Q» &bogus;");
    });
});

describe("decodeHtml", () => {
    it("honours the charset from the header or <meta charset>", () => {
        const cp1251 = Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]);
        expect(decodeHtml(cp1251, "text/html; charset=windows-1251")).toBe("Привет");
        expect(decodeHtml(Buffer.concat([Buffer.from('<meta charset="windows-1251">'), cp1251]), "text/html")).toContain("Привет");
        expect(decodeHtml(Buffer.from("héllo"), null)).toBe("héllo");
    });
});
