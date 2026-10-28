/** `https://www.example.com/a/b` → `example.com/a/b` — a readable stand-in for a link with no preview. Same `www.` rule as the backend's `displayDomain`. */
export function displayDomainOf(url: string): string {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname === "/" ? "" : parsed.pathname;
        return `${ parsed.hostname.replace(/^www\./, "") }${ path }`;
    } catch {
        return url;
    }
}
