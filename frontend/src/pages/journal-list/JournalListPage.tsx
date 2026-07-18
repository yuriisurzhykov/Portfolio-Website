import * as React from "react";
import { Link } from "react-router-dom";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useTranslation } from "@/shared/i18n";
import { journal, type JournalPost } from "@/data/journal";
import { journalPage } from "@/data/journalPage";
import { cn } from "@/shared/lib/utils";

function formatDate(post: JournalPost, ln: (key: string, vars?: Record<string, string | number>) => string) {
    if (post.status === "upcoming") {
        return ln("status.upcoming", { date: post.dateLabel ?? post.date });
    }
    return post.date;
}

function LogEntry({ post }: { post: JournalPost }) {
    const { ln } = useTranslation();
    const isPublished = post.status === "published";

    const inner = (
        <>
            <div
                className={cn(
                    "absolute left-0 top-[29px] w-[12px] h-[12px] rounded-full",
                    isPublished ? "bg-accent-solid" : "bg-text-faint",
                )}
            />
            <div className="flex gap-sm items-baseline mb-[8px] flex-wrap">
                <Text variant="caption" tone="faint" className="font-mono">
                    {formatDate(post, ln)}
                </Text>
                {isPublished && <StatusBadge tone="accent">{post.category}</StatusBadge>}
                {isPublished && (
                    <Text variant="caption" tone="faint" className="font-mono">
                        {ln("journal.readMins", { count: post.readMins })}
                    </Text>
                )}
            </div>
            <Text as="div" variant="h3" tone={isPublished ? "primary" : "muted"} className="mb-[6px] !text-[21px]">
                {post.title}
            </Text>
            <Text as="div" variant="caption" tone={isPublished ? "muted" : "faint"} className="max-w-[60ch] leading-[1.6]">
                {post.excerpt}
            </Text>
        </>
    );

    if (isPublished) {
        return (
            <Link to={`/journal/${post.slug}`} className="relative block py-[24px] pl-[34px]">
                {inner}
            </Link>
        );
    }

    // De-emphasized via the muted/faint text tones above (already WCAG AA-compliant on their
    // own), not via `opacity` — applying opacity to the whole block would uniformly fade these
    // already-borderline colors toward the background and fail contrast again (see
    // VISUAL_TESTING_GUIDE.md, section 11: to stay compliant, the opacity would need to go from
    // 0.45 to ~0.9, which defeats the purpose of dimming it at all).
    return (
        <div className="relative block py-[24px] pl-[34px]">
            {inner}
        </div>
    );
}

export function JournalListPage() {
    const { ln } = useTranslation();

    return (
        <main>
            <div className="max-w-[var(--layout-content-journal)] mx-auto px-[clamp(20px,4vw,24px)] pt-[clamp(48px,7vw,80px)] pb-[40px]">
                <Link to="/" className="font-mono text-caption text-text-muted">
                    ← {ln("button.backHome")}
                </Link>
                <Eyebrow tone="accent" className="mt-[24px] mb-[14px]">
                    {ln("eyebrow.journal")}
                </Eyebrow>
                <h1 className="m-0 mb-[16px] font-extrabold text-[clamp(30px,4vw,44px)] leading-[1.1] tracking-tight text-text-primary">
                    {journalPage.heading}
                </h1>
                <Text variant="body" tone="muted">
                    {journalPage.description}
                </Text>
            </div>

            <div className="relative max-w-[var(--layout-content-journal)] mx-auto px-[clamp(20px,4vw,24px)] pt-[8px] pb-[100px]">
                <div className="absolute left-[calc(clamp(20px,4vw,24px)+5px)] top-[8px] bottom-[100px] w-[2px] bg-border-subtle" />
                {journal.map((post) => (
                    <LogEntry key={post.slug} post={post} />
                ))}
            </div>
        </main>
    );
}
