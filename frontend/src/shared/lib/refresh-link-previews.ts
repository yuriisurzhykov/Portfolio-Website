import { refreshLinkPreviewsForBlocks, type BlockInput } from "@portfolio/backend";

/**
 * Called by the admin draft-save routes right after the body is parsed:
 * refreshes previews for any new or stale smart link in the background, so
 * autosave never waits on someone else's website. Fire-and-forget like
 * `ContentChangeNotifier` — a failure is already recorded per URL by the
 * backend (`LinkPreview.lastError`); anything that still escapes is only
 * logged, never turned into a failed save.
 */
export function refreshLinkPreviewsInBackground(blocks: readonly BlockInput[] | undefined): void {
    if (!blocks || blocks.length === 0) {
        return;
    }
    refreshLinkPreviewsForBlocks(blocks).catch((error: unknown) => {
        console.error("Background link-preview refresh failed", error instanceof Error ? error.name : "unknown error");
    });
}
