"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/form";
import { AdminApiError, adminApi } from "@/shared/lib/admin-api";

/**
 * Redirects go to `?from=<original path>`, set by `proxy.ts` when it
 * bounces an unauthenticated visit to `/admin/login` — falls back to the
 * journal list (the admin section's default landing spot) if there's no
 * `from` (e.g. the admin navigated here directly, not via a redirect).
 */
function useRedirectTarget(): string {
    const searchParams = useSearchParams();
    const from = searchParams.get("from");
    return from && from.startsWith("/admin") ? from : "/admin/journal";
}

export function AdminLoginPage() {
    const router = useRouter();
    const redirectTo = useRedirectTarget();

    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await adminApi.login(email, password);
            // `router.refresh()` before navigating: the Server Component
            // layout/pages under `/admin` read auth state via cookies on
            // every request, but the browser's Router Cache can otherwise
            // serve a stale, pre-login render for a route already visited
            // once this session (e.g. bounced from /admin/journal minutes
            // ago) — this forces a real re-fetch with the now-fresh cookie.
            router.refresh();
            router.push(redirectTo);
        } catch (err) {
            setError(err instanceof AdminApiError ? err.message : "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-[clamp(20px,4vw,56px)]">
            <Card variant="filled" className="w-full max-w-[380px] p-xl flex flex-col gap-lg">
                <div className="flex flex-col gap-xs">
                    <Text as="h1" variant="h3">Admin sign in</Text>
                    <Text variant="caption" tone="muted">Journal and work content management.</Text>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-md">
                    <Field label="Email" htmlFor="email">
                        <Input
                            id="email"
                            type="email"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </Field>
                    <Field label="Password" htmlFor="password">
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </Field>
                    {error && (
                        <Text variant="caption" className="text-status-error" role="alert">
                            {error}
                        </Text>
                    )}
                    <Button type="submit" fullWidth loading={submitting}>
                        Sign in
                    </Button>
                </form>
            </Card>
        </main>
    );
}
