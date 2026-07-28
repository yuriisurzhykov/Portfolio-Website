import { AppLayout } from "@/widgets/layout";
import { getSiteConfigSafe } from "@/shared/lib/get-site-config-safe";

/**
 * Chrome (Nav/Footer) for every public route except /storybook, which lives
 * outside this route group on purpose — see src/app/storybook/page.tsx.
 * `getSiteConfigSafe()`, not `getSiteContent("config")` directly — see its
 * own comment for why a layout-level DB read needs to never throw.
 */
export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const config = await getSiteConfigSafe();
    return <AppLayout config={config}>{children}</AppLayout>;
}
