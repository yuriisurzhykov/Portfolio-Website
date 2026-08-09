/**
 * Puts an already-serialized JSON-LD graph into the document.
 *
 * Takes a `string`, not an object, and that split is the whole point: the
 * escaping that makes the string safe lives in `json-ld.ts`'s
 * `serializeJsonLd` (pure, mutation-tested), while this file owns only
 * "how a script element gets its contents". The two change for different
 * reasons — schema.org evolving vs. the safe-insertion mechanism.
 *
 * Stays in `shared/lib/` rather than `shared/ui/`: it renders nothing
 * visible, so moving it would trigger the repo's Storybook-registration
 * rule for a component with no visual output. `render-with-fallback.tsx`
 * and `session-keepalive.tsx` set the same precedent for infrastructure
 * `.tsx` living here.
 */
export function JsonLd({ json }: { json: string }) {
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
