import { notFound } from "next/navigation";
import Link from "next/link";
import { getSiteContent, isSiteContentKey } from "@portfolio/backend";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { SettingsEditorPage, SITE_CONTENT_SECTIONS, type SettingsEditorPageProps } from "@/views/admin-settings-editor";
import { Text } from "@/shared/ui/text";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ key: string }>;
}

export default async function Page({ params }: PageProps) {
    const { key } = await params;
    if (!isSiteContentKey(key)) {
        notFound();
    }

    const section = SITE_CONTENT_SECTIONS.find((entry) => entry.key === key);

    return renderOrServiceUnavailable(
        () => getSiteContent(key),
        (initialData) => (
            <div className="flex flex-col gap-lg">
                <div>
                    <Link href="/admin/settings" className="font-mono text-caption text-text-muted">
                        ← All settings
                    </Link>
                    <Text as="h1" variant="h3" className="mt-2">{section?.label ?? key}</Text>
                </div>
                {/*
                 * `key`/`initialData` genuinely correlate at runtime — `getSiteContent(key)`
                 * validates `initialData` against `key`'s own Zod schema (see
                 * `site-content.ts`) — but `isSiteContentKey` only narrows `key` to the
                 * `SiteContentKey` union, not to the specific literal a discriminated
                 * union needs, so `SettingsEditorPageProps` can't be verified structurally
                 * here. Same class of generic-indexed-access gap as `site-content.ts`'s own
                 * comments on `getSiteContent`/`updateSiteContent`, at the boundary between
                 * this Server Component and the Client Component it renders instead of
                 * inside one function.
                 */}
                <SettingsEditorPage {...({ settingsKey: key, initialData } as SettingsEditorPageProps)} />
            </div>
        ),
    );
}
