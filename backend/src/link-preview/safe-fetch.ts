import { lookup as dnsLookup } from "node:dns/promises";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import zlib from "node:zlib";
import { isPublicAddress } from "./ip-guard";

/**
 * Every way a fetch can fail on purpose or by accident, as one error class
 * with a short, client-safe `reason` — `link-previews.ts` stores it in
 * `LinkPreview.lastError` and the admin popover shows it. Never carries the
 * resolved IP or a socket error's internals (see the methodology's "never
 * leak internal error details").
 */
export class LinkFetchError extends Error {
    constructor(readonly reason: string) {
        super(reason);
        this.name = "LinkFetchError";
    }
}

export interface ResolvedAddress {
    address: string;
    family: number;
}

export interface SafeFetchOptions {
    /** Hard cap on the (decompressed) body. Reading stops there and `truncated` is set — an HTML `<head>` is all that is needed anyway. */
    maxBytes: number;
    accept: string;
    acceptLanguage?: string;
    timeoutMs?: number;
    maxRedirects?: number;
    /** Stops reading as soon as `</head>` has arrived — the metadata never lives past it. */
    stopAtHeadEnd?: boolean;
    /** Test seams. Production always uses real DNS, `isPublicAddress` and ports 80/443 only. */
    resolve?: (hostname: string) => Promise<ResolvedAddress[]>;
    isAllowedAddress?: (address: string) => boolean;
    allowAnyPort?: boolean;
}

export interface SafeFetchResult {
    finalUrl: string;
    status: number;
    contentType: string | null;
    body: Buffer;
    truncated: boolean;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_REDIRECTS = 3;
/** Honest about what is asking, with a way for a site owner to find out who — `SITE_URL` when configured. */
function userAgent(): string {
    const contact = process.env.SITE_URL ? `; +${ process.env.SITE_URL }` : "";
    return `Mozilla/5.0 (compatible; PortfolioLinkPreview/1.0${ contact })`;
}

async function defaultResolve(hostname: string): Promise<ResolvedAddress[]> {
    return dnsLookup(hostname, { all: true, verbatim: true });
}

/**
 * Resolves `hostname` ONCE and refuses if ANY of its addresses is
 * non-public — a name with one public and one private A record is treated
 * as hostile, not "probably fine". The returned address is the one the
 * socket then connects to (`lookup` override below), so a DNS answer
 * cannot change between this check and the connection (DNS rebinding).
 */
async function resolveVetted(hostname: string, options: SafeFetchOptions): Promise<ResolvedAddress> {
    const isAllowed = options.isAllowedAddress ?? isPublicAddress;
    const bare = hostname.replace(/^\[|\]$/g, "");

    const addresses = isIP(bare) ? [{ address: bare, family: isIP(bare) }] : await (options.resolve ?? defaultResolve)(bare).catch(() => {
        throw new LinkFetchError("The site's address could not be resolved.");
    });
    if (addresses.length === 0) {
        throw new LinkFetchError("The site's address could not be resolved.");
    }
    if (!addresses.every((entry) => isAllowed(entry.address))) {
        throw new LinkFetchError("The link points at a private or reserved network address.");
    }
    return addresses[0];
}

function assertFetchableUrl(url: URL, options: SafeFetchOptions): void {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new LinkFetchError("Only http and https links can be previewed.");
    }
    if (url.username || url.password) {
        throw new LinkFetchError("Links with embedded credentials are not fetched.");
    }
    if (!options.allowAnyPort && url.port !== "" && url.port !== "80" && url.port !== "443") {
        throw new LinkFetchError("Only the standard web ports (80, 443) are fetched.");
    }
}

function decoded(response: IncomingMessage): NodeJS.ReadableStream {
    switch ((response.headers["content-encoding"] ?? "").toLowerCase()) {
        case "gzip":
        case "x-gzip":
            return response.pipe(zlib.createGunzip());
        case "deflate":
            return response.pipe(zlib.createInflate());
        case "br":
            return response.pipe(zlib.createBrotliDecompress());
        default:
            return response;
    }
}

const HEAD_END = /<\/head\s*>/i;

/** Reads the body up to `maxBytes`, then destroys the socket — never buffers a multi-gigabyte response just to look at its first kilobytes. */
function readCapped(response: IncomingMessage, options: SafeFetchOptions): Promise<{ body: Buffer; truncated: boolean }> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let settled = false;
        const stream = decoded(response);

        const finish = (truncated: boolean) => {
            if (settled) {
                return;
            }
            settled = true;
            response.destroy();
            resolve({ body: Buffer.concat(chunks).subarray(0, options.maxBytes), truncated });
        };

        stream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
            size += chunk.length;
            if (size >= options.maxBytes) {
                finish(true);
            } else if (options.stopAtHeadEnd && HEAD_END.test(chunk.toString("latin1"))) {
                finish(false);
            }
        });
        stream.on("end", () => finish(false));
        stream.on("error", (error) => {
            if (!settled) {
                settled = true;
                reject(error);
            }
        });
    });
}

function requestOnce(url: URL, vetted: ResolvedAddress, options: SafeFetchOptions, signal: AbortSignal): Promise<IncomingMessage> {
    const client = url.protocol === "https:" ? https : http;
    return new Promise((resolve, reject) => {
        const request = client.request(
            url,
            {
                method: "GET",
                signal,
                headers: {
                    "User-Agent": userAgent(),
                    Accept: options.accept,
                    "Accept-Language": options.acceptLanguage ?? "en",
                    "Accept-Encoding": "gzip, deflate, br",
                },
                // Pins the connection to the address `resolveVetted` already
                // checked — Node would otherwise run its own, second DNS
                // lookup here. TLS still verifies the certificate against the
                // URL's hostname (SNI comes from `url`, not from this).
                lookup: (_hostname, lookupOptions, callback) => {
                    if (lookupOptions.all) {
                        callback(null, [{ address: vetted.address, family: vetted.family }]);
                    } else {
                        callback(null, vetted.address, vetted.family);
                    }
                },
            },
            resolve,
        );
        request.on("error", reject);
        request.end();
    });
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * The one network primitive the link-preview slice uses — a GET that
 * enforces every rule in the design doc's "Безопасность" table: http(s)
 * only, ports 80/443, public addresses only (re-checked on every redirect
 * hop), at most 3 redirects, one overall deadline, a body size cap, no
 * cookies or credentials of ours. Plain `fetch` can't do this: it follows
 * redirects without letting us vet each hop's address, and has no way to
 * pin the socket to a pre-checked IP.
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions): Promise<SafeFetchResult> {
    const signal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new LinkFetchError("Not a valid URL.");
    }

    try {
        for (let hop = 0; ; hop++) {
            assertFetchableUrl(url, options);
            const vetted = await resolveVetted(url.hostname, options);
            const response = await requestOnce(url, vetted, options, signal);

            const location = response.headers.location;
            if (REDIRECT_STATUSES.has(response.statusCode ?? 0) && location) {
                response.destroy();
                if (hop >= maxRedirects) {
                    throw new LinkFetchError("Too many redirects.");
                }
                url = new URL(location, url);
                continue;
            }

            const { body, truncated } = await readCapped(response, options);
            return {
                finalUrl: url.toString(),
                status: response.statusCode ?? 0,
                contentType: response.headers["content-type"] ?? null,
                body,
                truncated,
            };
        }
    } catch (error) {
        if (error instanceof LinkFetchError) {
            throw error;
        }
        if (signal.aborted) {
            throw new LinkFetchError("The site took too long to respond.");
        }
        throw new LinkFetchError("The site could not be reached.");
    }
}
