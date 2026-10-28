import zlib from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LinkFetchError, safeFetch } from "./safe-fetch";
import { LOCAL_FETCH, startTestServer } from "./test-server";

let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
    server = await startTestServer((request, response) => {
        switch (request.url) {
            case "/page":
                response.writeHead(200, { "Content-Type": "text/html" });
                response.end("<html><head><title>Hi</title></head><body>body</body></html>");
                return;
            case "/gzip":
                response.writeHead(200, { "Content-Type": "text/html", "Content-Encoding": "gzip" });
                response.end(zlib.gzipSync("<head><title>Zipped</title></head>"));
                return;
            case "/big":
                response.writeHead(200, { "Content-Type": "text/html" });
                response.end("x".repeat(100_000));
                return;
            case "/hop":
                response.writeHead(302, { Location: "/page" });
                response.end();
                return;
            case "/loop":
                response.writeHead(302, { Location: "/loop" });
                response.end();
                return;
            case "/to-metadata":
                response.writeHead(302, { Location: "http://169.254.169.254/latest/meta-data/" });
                response.end();
                return;
            case "/slow":
                setTimeout(() => response.end("late"), 2000);
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

const html = { maxBytes: 64 * 1024, accept: "text/html" };

describe("safeFetch — network rules", () => {
    it("refuses loopback, private and metadata addresses with the default rules", async () => {
        for (const url of [`${ server.origin }/page`, "http://10.0.0.1/", "http://[::1]/", "http://169.254.169.254/"]) {
            await expect(safeFetch(url, { ...html, allowAnyPort: true })).rejects.toThrow(/private or reserved/);
        }
    });

    it("refuses a hostname that resolves to a private address", async () => {
        const resolve = async () => [{ address: "8.8.8.8", family: 4 }, { address: "192.168.0.10", family: 4 }];
        await expect(safeFetch("http://looks-public.example/", { ...html, resolve })).rejects.toThrow(/private or reserved/);
    });

    it("refuses non-standard ports, credentials and non-web schemes", async () => {
        await expect(safeFetch("http://example.com:8080/", html)).rejects.toThrow(/standard web ports/);
        await expect(safeFetch("http://user:pass@example.com/", html)).rejects.toThrow(/credentials/);
        await expect(safeFetch("file:///etc/passwd", html)).rejects.toThrow(/http and https/);
    });

    it("re-checks every redirect hop — a public page cannot bounce the server to a private one", async () => {
        const allowOnlyTestServer = (address: string) => address === "127.0.0.1";
        await expect(safeFetch(`${ server.origin }/to-metadata`, { ...html, allowAnyPort: true, isAllowedAddress: allowOnlyTestServer })).rejects.toThrow(/private or reserved/);
    });

    it("errors are LinkFetchError with a client-safe reason", async () => {
        const error = await safeFetch("http://10.0.0.1/", html).catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(LinkFetchError);
        expect((error as LinkFetchError).reason).not.toContain("10.0.0.1");
    });
});

describe("safeFetch — reading", () => {
    it("follows a redirect and reports the final URL", async () => {
        const result = await safeFetch(`${ server.origin }/hop`, { ...html, ...LOCAL_FETCH });
        expect(result.finalUrl).toBe(`${ server.origin }/page`);
        expect(result.body.toString()).toContain("<title>Hi</title>");
    });

    it("gives up after too many redirects", async () => {
        await expect(safeFetch(`${ server.origin }/loop`, { ...html, ...LOCAL_FETCH })).rejects.toThrow(/Too many redirects/);
    });

    it("decompresses gzip", async () => {
        const result = await safeFetch(`${ server.origin }/gzip`, { ...html, ...LOCAL_FETCH });
        expect(result.body.toString()).toContain("Zipped");
    });

    it("caps the body and marks it truncated", async () => {
        const result = await safeFetch(`${ server.origin }/big`, { ...html, ...LOCAL_FETCH, maxBytes: 1000 });
        expect(result.body.length).toBe(1000);
        expect(result.truncated).toBe(true);
    });

    it("stops at </head> when asked", async () => {
        const result = await safeFetch(`${ server.origin }/page`, { ...html, ...LOCAL_FETCH, stopAtHeadEnd: true });
        expect(result.truncated).toBe(false);
        expect(result.body.toString()).toContain("</head>");
    });

    it("times out", async () => {
        await expect(safeFetch(`${ server.origin }/slow`, { ...html, ...LOCAL_FETCH, timeoutMs: 200 })).rejects.toThrow(/too long/);
    });
});
