export const dynamic = "force-dynamic";

/**
 * IndexNow's ownership proof: the key, in plain text, at a URL this site
 * controls. Not a secret — the protocol requires any crawler to be able to
 * fetch it.
 *
 * A route handler reading `INDEXNOW_KEY`, rather than a committed file in
 * `public/`. IndexNow lets the submission name its own `keyLocation` (see
 * `shared/lib/seo/index-now.ts`), so the file does not have to be called
 * `<key>.txt` — and with a static file it would have to, meaning rotating
 * the key means renaming a committed file and editing an environment
 * variable in lockstep or the two silently disagree. One source of truth
 * instead.
 *
 * 404 when unset: a key file serving an empty body would verify nothing
 * and look like it did.
 */
export function GET(): Response {
    const key = process.env.INDEXNOW_KEY;
    if (!key) {
        return new Response("Not found", { status: 404 });
    }

    return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
