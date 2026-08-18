import type { ContentLocale } from "./locale";
import type { ContentKind } from "./slug-history";

/**
 * What happened to a piece of content, in the domain's own vocabulary —
 * no URLs, no origin, no `/ru` prefix. "Where this content lives on the
 * web" is a delivery detail that belongs to whatever serves it; this
 * package must not learn about it just so publishing can announce itself.
 */
export interface ContentChange {
    kind: ContentKind;
    slug: string;
    /**
     * The previous slug when this operation renamed the entity. Its old
     * address does not stop existing — `slug-history.ts` keeps it
     * resolvable so it answers with a permanent redirect, which is what
     * lets a crawler follow it and carry the old address's accumulated
     * signals over. `null` when nothing was renamed.
     */
    previousSlug: string | null;
    /** Whether the content is publicly reachable AFTER the operation — `false` for unpublish and delete. */
    isPublic: boolean;
    /** Locales this entity has its own version in — see `PostSummary.availableLocales` for why a list rather than a flag. */
    availableLocales: ContentLocale[];
}

/**
 * The port a use case talks to when content becomes discoverable, changes,
 * or disappears. "Publishing must tell search engines" is the use case's
 * own policy — pushing it out to route handlers would mean every handler
 * has to remember, and a forgotten one is precisely the bug this exists to
 * prevent.
 *
 * Returns `void`, not `Promise<void>`: an inner layer must not inherit the
 * latency of an external service. Implementations are fire-and-forget.
 */
export interface ContentChangeNotifier {
    contentChanged(change: ContentChange): void;
}

const NO_OP: ContentChangeNotifier = { contentChanged: () => {} };

let notifier: ContentChangeNotifier = NO_OP;

/**
 * Composition-root seam — called once at process start (see
 * `frontend/src/instrumentation.ts`), and by tests installing a fake.
 * The default is a no-op, so every consumer that never registers anything
 * (tests, scripts, the seed fixtures) behaves exactly as it did before
 * this port existed.
 */
export function setContentChangeNotifier(next: ContentChangeNotifier | null): void {
    notifier = next ?? NO_OP;
}

/**
 * Announce a change. Does not let the registered notifier's failure
 * propagate: "the article was published" is the outcome the caller asked
 * for, and a broken notification adapter has no business turning that into
 * a failed publish.
 *
 * Contained, not silenced. A notifier that throws on every call would
 * otherwise mean search engines are never told anything, with nothing
 * anywhere to say so.
 */
export function notifyContentChanged(change: ContentChange): void {
    try {
        notifier.contentChanged(change);
    } catch (error) {
        console.error(`[content-change] notifier threw for ${ change.kind } "${ change.slug }".`, error);
    }
}
