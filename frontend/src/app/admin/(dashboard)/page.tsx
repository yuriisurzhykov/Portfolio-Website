import { redirect } from "next/navigation";
import { requirePage } from "@/shared/lib/auth/guard";

/**
 * `/admin` itself has no content of its own — Journal is the default
 * landing spot once signed in. `requirePage()` here too, not just relying
 * on the shared layout — added during the OWASP audit remediation for
 * uniformity with every other page under this layout (Next.js doesn't
 * re-run a layout on client-side navigation, so a page whose OWN session
 * died could otherwise render here without a fresh check). This page
 * itself reads no admin data — the redirect below is the only thing it
 * ever does — so the practical risk was already nil, but there's no
 * reason for it to be the one exception to an otherwise universal rule.
 */
export default async function Page() {
    await requirePage();
    redirect("/admin/journal");
}
