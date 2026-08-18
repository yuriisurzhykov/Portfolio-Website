import type { Metadata } from "next";

/**
 * "Do not put this rendering in the index."
 *
 * Used for two different reasons that happen to need the same directives:
 * routes that should never be indexed at all (`/admin`, `/storybook`,
 * `/error/[code]`), and the degraded metadata a public route falls back to
 * during a database outage — see `generateMetadata` in `(site)/**`, where
 * the page still answers 200 with a placeholder body and a crawler must be
 * told not to treat that as the article.
 *
 * `follow: false` alongside `index: false`: during an outage the links on
 * the page are the fallback's, not the article's, and for `/admin` there is
 * nothing worth following either.
 */
export const NOINDEX: Metadata = { robots: { index: false, follow: false } };

/**
 * The permissive counterpart, emitted only when this deployment is
 * indexable at all.
 *
 * Its whole reason for existing is `max-image-preview: large`. Google's
 * default is `standard`, which shows a thumbnail — so without this the
 * site generates a 1200×630 card per page (see `seo/og/`) and then
 * withholds permission to display it, and Discover eligibility, which
 * REQUIRES `large`, is off entirely.
 *
 * `max-snippet: -1` lets Google use as much text as it judges useful
 * instead of a truncated default — worth having on long technical posts.
 *
 * Written at the top level of `robots`, not under `googleBot`. Next.js
 * accepts these directives in both places (verified against
 * `next/dist/lib/metadata/types/metadata-types.d.ts` — `RobotsInfo`
 * carries them, and `Robots` is `RobotsInfo & { googleBot }`), and the
 * top level puts them on the generic `<meta name="robots">`, which every
 * engine that understands them reads. A `googleBot`-only version would
 * hand the same permission to exactly one crawler.
 *
 * No `max-video-preview`: this content model has no video block at all
 * (`backend/src/content/blocks.ts` — lead, heading, paragraph, quote,
 * note, image, code, approachList, diagram, list), so it would be a
 * directive about something that cannot appear. Add it together with the
 * block type, not before.
 */
export const INDEXABLE: Metadata = {
    robots: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
    },
};
