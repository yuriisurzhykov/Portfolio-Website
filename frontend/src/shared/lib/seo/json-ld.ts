/**
 * schema.org node builders and the one function that turns a graph into
 * text safe to put inside a `<script>` element.
 *
 * Pure on purpose — no React, no `process.env`, no DOM. The security
 * invariant (`serializeJsonLd` below) lives here rather than in
 * `JsonLd.tsx` so it is inside the mutation-testing scope: a mutant that
 * deletes the escaping has to be killed by a test, and a `.tsx` file
 * would have dragged a jsdom render test into a scope that excludes them.
 * Same shape as `shared/lib/sanitize-svg.ts` — a `string`-in/`string`-out
 * function carrying a security rule.
 *
 * These builders describe what the page actually shows. `headline` is the
 * visible heading, `dateModified` is a real modification date (which is
 * why `Post.contentUpdatedAt` exists at all), `author` is a real person.
 * Structured data that disagrees with the page is the one Google spam
 * policy this whole area can trip over, so it's written down here rather
 * than left as something everyone happens to be doing.
 */

/** One schema.org node. Deliberately loose — a `@graph` mixes node types, and pinning each one down in TypeScript would restate schema.org rather than validate anything. */
export type JsonLdNode = Record<string, unknown>;

/** The site owner's identity node — one `@id` for the whole site, so every page's mention consolidates into a single entity. */
export function personId(siteUrl: string): string {
    return `${ siteUrl }/#person`;
}

export interface PersonInput {
    siteUrl: string;
    name: string;
    /** Profiles proving this is a real person — the external half of entity consolidation, while `@id` handles the internal half. */
    sameAs: string[];
}

export function personJsonLd({ siteUrl, name, sameAs }: PersonInput): JsonLdNode {
    return {
        "@type": "Person",
        "@id": personId(siteUrl),
        name,
        url: `${ siteUrl }/`,
        sameAs,
    };
}

export interface BlogPostingInput {
    siteUrl: string;
    /** Locale-neutral path of the post, e.g. `/journal/my-post`. */
    path: string;
    headline: string;
    description: string;
    image: string;
    datePublished: string | null;
    dateModified: string | null;
    /** BCP-47 tag of the language this rendering is in. */
    inLanguage: string;
}

export function blogPostingJsonLd(input: BlogPostingInput): JsonLdNode {
    const url = `${ input.siteUrl }${ input.path }`;
    return {
        "@type": "BlogPosting",
        "@id": `${ url }#post`,
        mainEntityOfPage: url,
        headline: input.headline,
        description: input.description,
        image: [input.image],
        ...(input.datePublished ? { datePublished: input.datePublished } : {}),
        ...(input.dateModified ? { dateModified: input.dateModified } : {}),
        inLanguage: input.inLanguage,
        // A reference, not a copy: two unconnected nodes with the same name
        // are two entities as far as a consumer is concerned, and it is the
        // consolidated one that carries weight. Resolvable because
        // `jsonLdGraph` puts the `Person` node in the same document —
        // validators do not follow an `@id` to another page, so a bare
        // cross-page reference reads as "author has no name".
        author: { "@id": personId(input.siteUrl) },
        publisher: { "@id": personId(input.siteUrl) },
    };
}

export interface BreadcrumbItem {
    name: string;
    /** Locale-neutral path, e.g. `/journal`. */
    path: string;
}

export function breadcrumbJsonLd(siteUrl: string, items: BreadcrumbItem[]): JsonLdNode {
    return {
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: `${ siteUrl }${ item.path }`,
        })),
    };
}

/** Wraps nodes into the single `@graph` document each page emits — one `<script>`, one `@context`, every node addressable by `@id`. */
export function jsonLdGraph(nodes: JsonLdNode[]): JsonLdNode {
    return { "@context": "https://schema.org", "@graph": nodes };
}

/**
 * JSON text safe to place inside `<script type="application/ld+json">`.
 *
 * A post title containing `</script>` would otherwise close the element
 * early and drop the rest of the page's markup into it — escaping `<` as
 * `\u003c` is valid JSON (the parser reads back the original character)
 * and is invisible to the HTML tokenizer.
 */
export function serializeJsonLd(data: unknown): string {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}
