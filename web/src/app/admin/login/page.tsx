import { Suspense } from "react";
import { AdminLoginPage } from "@/views/admin-login";

/**
 * Only public path under `/admin` — see `proxy.ts`'s `PUBLIC_ADMIN_PATHS`.
 * Sits outside the `(dashboard)` route group on purpose: it must not get
 * `<AdminNav/>` (no "Log out" button makes sense on the sign-in screen
 * itself, and showing Journal/Work links before the visitor is
 * authenticated would be actively misleading).
 */
export default function Page() {
    return (
        <Suspense>
            <AdminLoginPage />
        </Suspense>
    );
}
