"use client";

import type { PostInput, PostSummary, WorkInput, WorkSummary } from "@portfolio/backend";

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

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message = (payload as { error?: string } | null)?.error ?? `Request failed with status ${ response.status }.`;
        throw new AdminApiError(response.status, message);
    }

    if (response.status === 204) {
        return undefined as T;
    }
    return response.json() as Promise<T>;
}

export interface AdminLoginResult {
    user: { id: string; email: string; role: string };
}

export const adminApi = {
    login: (email: string, password: string) => request<AdminLoginResult>("POST", "/api/auth/login", { email, password }),
    logout: () => request<{ ok: true }>("POST", "/api/auth/logout"),

    createPost: (input: PostInput) => request<PostSummary>("POST", "/api/admin/posts", input),
    updatePost: (slug: string, input: PostInput) => request<PostSummary>("PUT", `/api/admin/posts/${ encodeURIComponent(slug) }`, input),
    deletePost: (slug: string) => request<{ ok: true }>("DELETE", `/api/admin/posts/${ encodeURIComponent(slug) }`),

    createWork: (input: WorkInput) => request<WorkSummary>("POST", "/api/admin/work", input),
    updateWork: (slug: string, input: WorkInput) => request<WorkSummary>("PUT", `/api/admin/work/${ encodeURIComponent(slug) }`, input),
    deleteWork: (slug: string) => request<{ ok: true }>("DELETE", `/api/admin/work/${ encodeURIComponent(slug) }`),
};
