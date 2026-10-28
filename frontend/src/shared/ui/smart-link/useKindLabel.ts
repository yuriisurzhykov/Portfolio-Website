import type { LinkPreviewView } from "@portfolio/backend";
import { useTranslation } from "@/shared/i18n";

/** "project" / "post" for own content, the site's name (or domain) for an external page — the small mono label next to a title. */
export function useKindLabel(preview: LinkPreviewView): string {
    const { ln } = useTranslation();
    if (preview.kind === "work") {
        return ln("smartLink.kind.work");
    }
    if (preview.kind === "post") {
        return ln("smartLink.kind.post");
    }
    return preview.siteName && preview.siteName.toLowerCase() !== preview.domain ? `${ preview.domain } · ${ preview.siteName }` : preview.domain;
}
