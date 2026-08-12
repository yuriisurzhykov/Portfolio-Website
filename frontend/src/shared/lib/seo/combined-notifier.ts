import type { ContentChange, ContentChangeNotifier } from "@portfolio/backend";

/**
 * Fans one domain event out to every registered adapter. `setContentChangeNotifier`
 * (backend/src/content/content-change-notifier.ts) only ever holds ONE
 * notifier — needed once IndexNow and OG-cache warm-up (og-warmup.ts) both
 * want to react to the same event, without either adapter knowing the other
 * exists or `instrumentation.node.ts` growing a second seam for the same port.
 *
 * Each notifier runs inside its own try/catch: a bug in one adapter (say,
 * IndexNow throwing on a malformed key) must not stop an unrelated adapter
 * (OG warm-up) from running — the two are independent side effects of the
 * same event, not a pipeline. `notifyContentChanged`'s own try/catch (the
 * backend package) still exists as a second, outer safety net, but it can
 * only protect the FIRST failure in a naive loop; this is what actually
 * guarantees every adapter gets a turn.
 */
export function combineContentChangeNotifiers(notifiers: ContentChangeNotifier[]): ContentChangeNotifier {
    return {
        contentChanged(change: ContentChange): void {
            for (const notifier of notifiers) {
                try {
                    notifier.contentChanged(change);
                } catch (error) {
                    console.error("[content-change] one combined notifier threw; continuing with the rest.", error);
                }
            }
        },
    };
}
