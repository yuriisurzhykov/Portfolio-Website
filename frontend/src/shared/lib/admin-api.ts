"use client";

import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE, LOGIN_PATH } from "@/shared/lib/auth/constants";
import type {
    PostInput,
    PostSummary,
    SiteContentDataMap,
    SiteContentKey,
    TechIcon,
    TranslatePostInput,
    TranslateWorkInput,
    WorkInput,
    WorkSummary,
} from "@portfolio/backend";
// Type-only, and it must stay that way: `shared/lib/tech-icons`'s runtime
// exports reach `simple-icons` (~3450 icons), which must never enter a
// client bundle — see that slice's README.
import type { BrandIconSearchResult, TechIconView } from "@/shared/lib/tech-icons";

/**
 * Every mutation from the admin UI (Post/Work create/update/delete,
 * login/logout) goes through this one `fetch()` wrapper — matching the
 * migration plan's Phase 4 requirement that the admin UI itself talks to
 * `/api/admin/*`/`/api/auth/*` as plain JSON, the exact same contract a
 * future mobile client would use, rather than a framework-only mechanism
 * (Next.js Server Actions) a mobile app could never call. One error
 * type/one JSON-body-shape assumption lives here instead of repeated in
 * every form's submit handler.
 *
 * `"use client"`: the relative URLs below (`/api/admin/posts`, ...) only
 * resolve the way this module assumes — against the browser's current
 * page origin — when `fetch` actually runs in a browser. Marking this
 * client-only makes that assumption explicit instead of something that
 * would only surface as a confusing runtime error if a Server Component
 * ever imported it.
 */
export class AdminApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "AdminApiError";
        this.status = status;
    }
}

/**
 * Thrown instead of a plain `AdminApiError` when a 401 survives a silent
 * refresh attempt (see `request()` below) — i.e. the refresh token itself
 * is gone, not just the access token. Callers that want to redirect to
 * `/admin/login` on session death, rather than showing "Something went
 * wrong" like any other error, can check for this specific type. `request()`
 * itself already does that redirect (see below) before this ever reaches a
 * caller in practice — exported mainly so a caller CAN distinguish it if it
 * ever needs to (e.g. to skip showing its own generic error banner).
 */
export class SessionExpiredError extends AdminApiError {
    constructor() {
        super(401, "Your session has expired. Please sign in again.");
        this.name = "SessionExpiredError";
    }
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Calls `/api/auth/refresh` at most once concurrently — if several
 * requests hit a dead access token around the same time (e.g. a page with
 * multiple parallel fetches), they share one refresh attempt instead of
 * each independently racing to rotate the SAME refresh token (rotation is
 * single-use — see `backend/src/auth/session.ts` — a second concurrent
 * rotation attempt against an already-rotated token would itself look like
 * a compromised/replayed token and fail).
 */
function refreshSessionOnce(): Promise<boolean> {
    if (!refreshInFlight) {
        refreshInFlight = fetch("/api/auth/refresh", { method: "POST" })
            .then((response) => response.ok)
            .catch(() => false)
            .finally(() => {
                refreshInFlight = null;
            });
    }
    return refreshInFlight;
}

/**
 * Sends the visitor to the sign-in page, remembering where they were.
 *
 * Does NOTHING when they are already on `/admin/login`, and that guard is
 * load-bearing rather than tidy: `from` is built from
 * `pathname + search`, so redirecting to login FROM login nested the
 * previous `from` inside the new one and re-encoded it every time —
 * `?from=%2Fadmin%2Flogin%3Ffrom%3D%252Fadmin%252Flogin%253Ffrom%253D...`,
 * growing without bound. It also meant a hard page load that wiped the
 * error message the visitor needed to read.
 */
function redirectToLogin(): void {
    if (window.location.pathname.startsWith(LOGIN_PATH)) {
        return;
    }
    const from = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`${ LOGIN_PATH }?from=${ from }`);
}

async function parseErrorMessage(response: Response): Promise<string> {
    const payload: unknown = await response.json().catch(() => null);
    return (payload as { error?: string } | null)?.error ?? `Request failed with status ${ response.status }.`;
}

async function doFetch(method: string, url: string, body: unknown | undefined): Promise<Response> {
    // CSRF_HEADER_NAME/_VALUE — see guard.ts's defineAdminRoute /
    // constants.ts's own comment for the full reasoning. Sent
    // unconditionally (not just for mutating methods) rather than
    // duplicating guard.ts's method-matching logic here too — the server
    // only actually enforces it on POST/PUT/PATCH/DELETE, so sending it on
    // a hypothetical future GET call through this same wrapper would just
    // be a harmless no-op header.
    return fetch(url, {
        method,
        headers: {
            [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

/**
 * On a 401: try ONE silent refresh, then retry the original request ONCE.
 * This is the reactive half of session resilience — the proactive half
 * (`useSessionKeepAlive`, `session-keepalive.tsx`) refreshes ahead of
 * expiry so this path should rarely trigger in practice, but covers
 * whatever the proactive timer missed (laptop asleep through the refresh
 * window, a request in flight exactly as the access token expired, ...).
 * If the retry ALSO 401s, the refresh token itself is dead — this is the
 * fix for "the admin is left on the page thinking something broke" rather
 * than being sent back to sign in: an explicit, hard redirect to
 * `/admin/login?from=<path>`, not a silently swallowed error.
 */
async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    let response = await doFetch(method, url, body);

    if (response.status === 401) {
        const refreshed = await refreshSessionOnce();
        if (refreshed) {
            response = await doFetch(method, url, body);
        }
    }

    if (!response.ok) {
        if (response.status === 401) {
            redirectToLogin();
            throw new SessionExpiredError();
        }
        const message = await parseErrorMessage(response);
        throw new AdminApiError(response.status, message);
    }

    return readBody<T>(response);
}

/**
 * The same call without ANY of the session-recovery behavior above — no
 * silent refresh, no redirect. A 401 here is just an error, reported to
 * the caller with the server's own message.
 *
 * For endpoints that ESTABLISH a session rather than consume one. On
 * `/api/auth/login` a 401 means "wrong email or password", not "your
 * session expired", and `request()`'s reaction to it was actively
 * harmful: it navigated to the sign-in page — from the sign-in page —
 * which both wiped the error message before it could render and grew the
 * `?from=` parameter on every attempt (see `redirectToLogin`). Every
 * failed sign-in looked like an infinite redirect loop.
 *
 * Same reasoning `refresh` below already documents for itself: an
 * operation that IS the recovery must not be routed through the thing
 * that triggers the recovery.
 */
async function requestWithoutSessionRecovery<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await doFetch(method, url, body);
    if (!response.ok) {
        throw new AdminApiError(response.status, await parseErrorMessage(response));
    }
    return readBody<T>(response);
}

async function readBody<T>(response: Response): Promise<T> {
    if (response.status === 204) {
        return undefined as T;
    }
    return response.json() as Promise<T>;
}

export interface AdminLoginResult {
    user: { id: string; email: string; role: string };
}

export const adminApi = {
    // NOT `request()` — see `requestWithoutSessionRecovery`. A 401 here is
    // "wrong credentials", the one 401 in this app that must surface to
    // the caller as a message rather than trigger a trip to the sign-in
    // page the visitor is already looking at.
    login: (email: string, password: string) =>
        requestWithoutSessionRecovery<AdminLoginResult>("POST", "/api/auth/login", { email, password }),
    // Stays on `request()`: a 401 while ENDING a session genuinely means
    // the session is already gone, and being sent to sign in is the right
    // answer. `redirectToLogin`'s own guard makes that safe.
    logout: () => request<{ ok: true }>("POST", "/api/auth/logout"),
    // Used by `useSessionKeepAlive` for its proactive heartbeat —
    // deliberately NOT routed through `request()` above: refreshing IS the
    // recovery mechanism `request()` itself calls on a 401, so this needs
    // to be the plain, un-intercepted call it wraps (shared via
    // `refreshSessionOnce`'s single-flight guard), or a failed heartbeat
    // refresh would recurse into trying to refresh again. Throws (rather
    // than returning a boolean) so callers can use a plain `try/catch`,
    // matching every other method here.
    refresh: async () => {
        const ok = await refreshSessionOnce();
        if (!ok) {
            throw new SessionExpiredError();
        }
    },

    createPost: (input: PostInput) => request<PostSummary>("POST", "/api/admin/posts", input),
    updatePost: (slug: string, input: PostInput) => request<PostSummary>("PUT", `/api/admin/posts/${ encodeURIComponent(slug) }`, input),
    deletePost: (slug: string) => request<{ ok: true }>("DELETE", `/api/admin/posts/${ encodeURIComponent(slug) }`),
    // No body — see the route's own comment (admin-posts.ts's
    // `publishPost`/`unpublishPost`): these validate/flip whatever's
    // already saved, they don't accept content changes.
    publishPost: (slug: string) => request<PostSummary>("POST", `/api/admin/posts/${ encodeURIComponent(slug) }/publish`),
    unpublishPost: (slug: string) => request<PostSummary>("POST", `/api/admin/posts/${ encodeURIComponent(slug) }/unpublish`),

    createWork: (input: WorkInput) => request<WorkSummary>("POST", "/api/admin/work", input),
    updateWork: (slug: string, input: WorkInput) => request<WorkSummary>("PUT", `/api/admin/work/${ encodeURIComponent(slug) }`, input),
    deleteWork: (slug: string) => request<{ ok: true }>("DELETE", `/api/admin/work/${ encodeURIComponent(slug) }`),
    publishWork: (slug: string) => request<WorkSummary>("POST", `/api/admin/work/${ encodeURIComponent(slug) }/publish`),
    unpublishWork: (slug: string) => request<WorkSummary>("POST", `/api/admin/work/${ encodeURIComponent(slug) }/unpublish`),

    // Separate from `updatePost`/`updateWork` — see the two `[slug]/translation`
    // route files' top comments — this is the only path that ever writes
    // a Russian value for these records.
    translatePost: (slug: string, input: TranslatePostInput) =>
        request<PostSummary>("PUT", `/api/admin/posts/${ encodeURIComponent(slug) }/translation`, input),
    translateWork: (slug: string, input: TranslateWorkInput) =>
        request<WorkSummary>("PUT", `/api/admin/work/${ encodeURIComponent(slug) }/translation`, input),

    // No `getSiteContent` here — the settings edit page loads its initial
    // data server-side (`getSiteContent()` called directly in
    // `app/admin/(dashboard)/settings/[key]/page.tsx`), same as
    // `WorkEditorPage`'s edit route calls `getWorkBySlug` directly rather
    // than round-tripping through this client and `/api/admin/work/[slug]`
    // GET. Only the write side needs a browser-callable endpoint.
    updateSiteContent: <K extends SiteContentKey>(key: K, data: SiteContentDataMap[K]) =>
        request<SiteContentDataMap[K]>("PUT", `/api/admin/settings/${ encodeURIComponent(key) }`, data),

    // Backs the tech-stack editor's quick-add autocomplete and its per-row
    // "Brand" picker (`views/admin-settings-editor/tech-stack`).
    searchTechIcons: (query: string) =>
        request<BrandIconSearchResult[]>("GET", `/api/admin/tech-icons?q=${ encodeURIComponent(query) }`),

    // One request for the whole visible list, not one per row — see that
    // route's own comment for why resolution has to happen server-side at
    // all, and why this half of it is a POST despite being a read.
    resolveTechIcons: (items: { name: string; icon: TechIcon }[]) =>
        request<{ views: TechIconView[] }>("POST", "/api/admin/tech-icons", { items }),
};
