import Link from "next/link";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { SITE_CONTENT_SECTIONS } from "@/views/admin-settings-editor";
import { requirePage } from "@/shared/lib/auth/guard";

/**
 * No `renderOrServiceUnavailable`/database read here — unlike `/admin/work`
 * (a real list of DB rows), the 7 sections are a fixed, known set declared
 * in `content/site-content.ts`; this page is just a static index of links,
 * same reasoning as `AdminNav`'s hardcoded `links` array. `requirePage()`
 * is still called, though — added during the OWASP audit remediation for
 * uniformity with every other page under this layout, even though this
 * one's own content is static and reveals nothing itself; see `/admin`'s
 * root page for the identical reasoning.
 */
export default async function Page() {
    await requirePage();
    return (
        <div className="flex flex-col gap-lg">
            <Text as="h1" variant="h3">Site settings</Text>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                {SITE_CONTENT_SECTIONS.map((section) => (
                    <Link key={section.key} href={`/admin/settings/${section.key}`}>
                        <Card variant="filled" interactive className="p-lg h-full flex flex-col gap-xs">
                            <Text as="h2" variant="h5">{section.label}</Text>
                            <Text variant="caption" tone="muted">{section.description}</Text>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
