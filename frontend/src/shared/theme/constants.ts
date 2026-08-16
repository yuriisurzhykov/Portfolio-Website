// Deliberately its OWN file, with no "use client" directive — found live,
// not assumed: `theme.context.tsx` (where this constant used to live) IS
// marked "use client", and React Server Components treat a "use client"
// module as an opaque client reference from server-side code. Only its
// COMPONENT exports cross that boundary correctly; a plain value export
// (like this string) came through as `undefined` when imported into
// `app/theme-init-script.tsx` (a Server Component) — silently breaking the
// inline script's `localStorage.getItem(undefined)` call (reads the key
// literally named "undefined", not the real preference) without a single
// error or warning anywhere. A shared, directive-free constants file is
// safe to import from either side of that boundary.
export const THEME_STORAGE_KEY = "portfolio.theme-preference";
