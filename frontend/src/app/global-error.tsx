"use client";

import "@/app/styles/index.css";
import { jetbrainsMono, publicSans } from "@/app/fonts";
import { ThemeInitScript } from "@/app/theme-init-script";
import { MainProviders } from "@/app/providers/MainProviders";
import { StatusPage } from "@/shared/ui/status-page";

/**
 * Next.js's error boundary for a crash in the ROOT layout itself (as
 * opposed to `(site)/error.tsx`, which only catches errors below it) —
 * didn't exist before this change, so a root-layout crash fell straight
 * through to Next's bare, unstyled default screen. Required by Next.js to
 * define its own `<html>`/`<body>` (it fully replaces `app/layout.tsx`,
 * including the shell that failed), so it re-imports the same global
 * stylesheet `RootLayout` normally provides — without it, `StatusPage`'s
 * Tailwind classes would resolve against undefined CSS custom properties
 * and render unstyled.
 *
 * Reuses `MainProviders` (Theme + i18n) rather than a bare `I18nProvider`
 * — `Card`/`Button`/etc. don't currently read theme context themselves
 * (they're plain Tailwind classes against CSS vars, dark by default), but
 * matching what `RootLayout` actually provides is one less thing to
 * re-verify if that ever changes. No `getRequestLocale()` here: a
 * root-layout failure means the request never got far enough to resolve
 * one reliably, and `MainProviders` already defaults to English on its
 * own — an acceptable trade in this genuinely last-resort case for not
 * adding another thing that could itself fail.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        // `suppressHydrationWarning` — see `app/layout.tsx`'s identical
        // comment; `ThemeInitScript` mutates this element's classList
        // before hydration, on this file's own separate `<html>` too.
        <html lang="en" className={ `h-full ${ publicSans.variable } ${ jetbrainsMono.variable }` } suppressHydrationWarning>
        <head>
            <ThemeInitScript />
        </head>
        <body className="min-h-full flex flex-col antialiased">
        <MainProviders>
            <StatusPage code={ 500 } onRetry={ reset }/>
        </MainProviders>
        </body>
        </html>
    );
}
