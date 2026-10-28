import * as React from "react";
import Link from "next/link";

export interface SmartLinkAnchorProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    href: string;
    /** `true` for this site's own Work/Post — client-side navigation via `next/link`, same tab. */
    internal: boolean;
}

/**
 * The one `<a>` every smart-link variant renders through: external pages
 * open in a new tab with `noopener noreferrer` (a reader leaves the
 * article on purpose, never by accident, and the other site gets no
 * `window.opener`); own pages are ordinary `next/link` navigation.
 */
export function SmartLinkAnchor({ href, internal, children, ...rest }: SmartLinkAnchorProps) {
    if (internal) {
        return <Link href={ href } { ...rest }>{ children }</Link>;
    }
    return (
        <a href={ href } target="_blank" rel="noopener noreferrer" { ...rest }>
            { children }
        </a>
    );
}
