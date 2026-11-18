import type { Metadata } from "next";
import { IP_CAMERAS_HUB_POLICY, PrivacyPolicyPage } from "@/views/privacy-policy";
import { getRequestLocale } from "@/shared/lib/get-request-locale";
import { alternatesFor } from "@/shared/lib/seo/alternates";
import { clampMetaDescription } from "@/shared/lib/seo/meta-description";

// The text is a constant of this repo, but the layout above reads site config from the
// database — static prerendering would freeze Nav/Footer at build time (see journal/page.tsx).
export const dynamic = "force-dynamic";

/** Permanent: Google Play stores this address in the app's listing, so never rename it. */
const PATH = "/privacy/ip-cameras-hub";

const TITLE = "Privacy Policy – IP Cameras Hub";

const DESCRIPTION = "Learn how IP Cameras Hub handles camera connections, local storage, crash reports, and optional analytics.";

/** English only, so a `/ru` request canonicalizes to the English URL (see `alternatesFor`). */
export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRequestLocale();
    return {
        title: TITLE,
        description: clampMetaDescription(DESCRIPTION),
        alternates: alternatesFor(PATH, locale, ["en"]),
    };
}

export default function Page() {
    return <PrivacyPolicyPage policy={ IP_CAMERAS_HUB_POLICY } />;
}
