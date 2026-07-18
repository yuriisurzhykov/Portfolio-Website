import { AppLayout } from "@/widgets/layout";

/**
 * Chrome (Nav/Footer) for every public route except /storybook, which lives
 * outside this route group on purpose — see src/app/storybook/page.tsx.
 */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <AppLayout>{children}</AppLayout>;
}
