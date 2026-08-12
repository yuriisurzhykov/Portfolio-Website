import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * The reversibility seam for the storage DECISION (disk today, see
 * `media/README.md`'s "Хранилище" entry), not a "just in case" abstraction —
 * `MediaAsset.storageKey` (schema.prisma) stores only a `MediaStore`-scoped
 * key, never an absolute URL or filesystem path, so moving to R2/S3 later is
 * a script that re-uploads bytes under an equivalent key, not a database
 * migration touching every row.
 */
export interface MediaStore {
    put(storageKey: string, bytes: Buffer, mimeType: string): Promise<void>;
    /** The public, servable URL for a key already `put()` — a relative path (e.g. `/media/covers/<hash>-1200.webp`), never an absolute one; the caller decides how/whether to prefix an origin. */
    url(storageKey: string): string;
    delete(storageKey: string): Promise<void>;
}

/**
 * Rejects a `storageKey` containing `..` path segments — every real key
 * this app ever generates is a content hash (`covers/<sha256>-<width>.webp`,
 * see `covers.ts`), so this can never legitimately fire in production. It
 * exists as defense in depth, not a first line of defense: a hostile
 * `storageKey` would have to originate from a bug elsewhere in this
 * package, since nothing here ever takes one from an HTTP request body.
 */
export class UnsafeStorageKeyError extends Error {
    constructor(storageKey: string) {
        super(`Refusing to use storage key with a path-traversal segment: "${ storageKey }"`);
        this.name = "UnsafeStorageKeyError";
    }
}

function assertSafeStorageKey(storageKey: string): void {
    const segments = storageKey.split(/[/\\]/);
    if (segments.some((segment) => segment === "..")) {
        throw new UnsafeStorageKeyError(storageKey);
    }
}

/**
 * Disk adapter — the ONE real implementation today (see media/README.md's
 * "Хранилище: диск VPS" entry for why disk, not R2/S3, at this content
 * volume). `rootDir` is a directory OUTSIDE any deploy's `releases/<n>/`
 * (provisioned once, at `${APP_BASE_DIR}/shared/media` in production — see
 * `.scripts/provision/05-app-dirs.sh`), so generated covers survive every
 * deploy instead of vanishing with the release that created them.
 * `urlPrefix` matches the nginx `location` this same directory is served
 * under in production (`.scripts/provision/10-nginx-site.sh`) — in dev,
 * with no nginx in front, `frontend/src/app/media/[...path]/route.ts` reads
 * from this exact same directory and serves the same URL shape, so
 * `coverUrlFor` never needs to know which of the two is actually running.
 */
export class DiskMediaStore implements MediaStore {
    constructor(
        private readonly rootDir: string,
        private readonly urlPrefix: string = "/media",
    ) {}

    async put(storageKey: string, bytes: Buffer, _mimeType: string): Promise<void> {
        assertSafeStorageKey(storageKey);
        const filePath = path.join(this.rootDir, storageKey);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, bytes);
    }

    url(storageKey: string): string {
        assertSafeStorageKey(storageKey);
        return `${ this.urlPrefix }/${ storageKey }`;
    }

    async delete(storageKey: string): Promise<void> {
        assertSafeStorageKey(storageKey);
        await fs.rm(path.join(this.rootDir, storageKey), { force: true });
    }
}

/**
 * `MEDIA_DIR` lets dev, CI, and each provisioned VPS target (dev/prod each
 * have their OWN media directory, same as they have their own database —
 * see media/README.md) point at a different real path without a code
 * change. The fallback default (`<repo>/backend/media`, gitignored) is only
 * SAFE when this file runs un-bundled — a `tsx` script (`seed-e2e-fixtures.ts`,
 * `create-admin.ts`) or a Vitest test, where `__dirname` genuinely points
 * at this source file's real location.
 *
 * **It is NOT safe inside the Next.js server** — found live, not assumed:
 * `frontend/next.config.ts` compiles `@portfolio/backend` into its own
 * bundle (`transpilePackages`), and a bundled copy's `__dirname` no longer
 * points at `backend/src/media` at all, so this fallback silently resolves
 * to the wrong directory there. `next.config.ts` works around this by
 * setting `process.env.MEDIA_DIR` explicitly, itself (see that file's own
 * comment) — anything running inside the Next.js process must be able to
 * assume `MEDIA_DIR` is ALWAYS set by the time it reads `process.env` here,
 * never rely on reaching this fallback branch.
 *
 * Exported (not just used internally by `getMediaStore` below) because
 * `frontend/src/app/media/[...path]/route.ts` — the dev-time (and portable
 * fallback) file server for this exact directory, see that route's own
 * comment — needs to resolve the IDENTICAL path independently, without
 * duplicating this default and risking the two silently drifting apart.
 */
export function resolveMediaRootDir(): string {
    return process.env.MEDIA_DIR ?? path.resolve(__dirname, "..", "..", "media");
}

let cachedStore: MediaStore | undefined;

/**
 * Env-factory, same shape as `getRateLimiter()`/`getImageGenerator()`.
 */
export function getMediaStore(): MediaStore {
    if (!cachedStore) {
        cachedStore = new DiskMediaStore(resolveMediaRootDir());
    }
    return cachedStore;
}

/** Test-only escape hatch, same reasoning as `setRateLimiterForTesting`. */
export function setMediaStoreForTesting(store: MediaStore | undefined): void {
    cachedStore = store;
}
