import { NOINDEX } from "@/shared/lib/seo/noindex";

/**
 * A metadata-only layout: it adds no markup, and exists so that "nothing
 * under /admin is indexable" is stated ONCE, for the whole subtree.
 *
 * `(dashboard)/layout.tsx` used to carry that declaration, and it was a
 * real gap: `/admin/login` sits OUTSIDE that route group on purpose (no
 * `<AdminNav/>` on the sign-in screen), so it inherited nothing and was
 * served with the site-wide permissive `robots` — found by reading the
 * actual emitted `<meta name="robots">` on every route, not from the code.
 * robots.txt disallows `/admin`, but that forbids crawling, not indexing:
 * a URL someone links to can still land in the results page.
 */
export const metadata = NOINDEX;

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return children;
}
