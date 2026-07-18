import * as React from "react";
import { Link } from "react-router-dom";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Text } from "@/shared/ui/text";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useTranslation } from "@/shared/i18n";
import { work, type WorkItem } from "@/data/work";
import { workPage } from "@/data/workPage";
import { cn } from "@/shared/lib/utils";

const desktopRowGridCols = "sm:grid-cols-[100px_1fr_auto_auto]";

function WorkRow({item}: { item: WorkItem }) {
    const {ln, pick} = useTranslation();
    const isShipped = item.status === "shipped";
    const href = item.caseStudy ? `/work/${ item.slug }` : item.relatedPostSlug ? `/journal/${ item.relatedPostSlug }` : undefined;

    const statusBadge = (
        <StatusBadge tone={ isShipped ? "success" : "warning" } className="whitespace-nowrap">
            { ln(isShipped ? "status.shipped" : "status.inProgress") }
        </StatusBadge>
    );

    const wrapperClass = cn(
        "block border-b border-border-subtle",
        href && "hover:bg-surface-row-hover transition-colors duration-fast rounded-lg",
    );

    const body = (
        <>
            {/* Mobile: stacked card */ }
            <div className="sm:hidden py-[18px] px-4">
                <div className="flex items-center justify-between gap-sm mb-2">
                    <span className="font-mono text-caption text-text-faint">{ item.year }</span>
                    <div className="flex items-center gap-xs">
                        { statusBadge }
                        { href && <span className="text-text-muted">→</span> }
                    </div>
                </div>
                <Text as="div" variant="h3" className="mb-1 text-[18px]!">
                    { item.title }
                </Text>
                <Text as="div" variant="body" tone="muted" className="leading-[1.5]">
                    { pick(item.summary) }
                </Text>
            </div>

            {/* sm and up: ledger row */ }
            <div className={ cn("hidden sm:grid items-center gap-4 py-[26px] px-5", desktopRowGridCols) }>
                <span className="font-mono text-caption text-text-faint">{ item.year }</span>
                <div>
                    <Text as="div" variant="h3" className="mb-1">
                        { item.title }
                    </Text>
                    <Text as="div" variant="body" tone="muted" className="leading-[1.5]">
                        { pick(item.summary) }
                    </Text>
                </div>
                <span className="font-mono text-caption text-text-muted whitespace-nowrap self-center">
                    { item.stack.slice(0, 2).join(" · ") }
                </span>
                <div className="flex items-center gap-sm self-center">
                    { statusBadge }
                    { href && <span className="text-text-muted">→</span> }
                </div>
            </div>
        </>
    );

    if (href) {
        return (
            <Link to={ href } className={ wrapperClass }>
                { body }
            </Link>
        );
    }

    return <div className={ wrapperClass }>{ body }</div>;
}

export function WorkListPage() {
    const {ln, pick} = useTranslation();

    return (
        <main>
            <div
                className="max-w-(--layout-content-narrow) mx-auto px-[clamp(20px,4vw,56px)] pt-[clamp(48px,7vw,80px)] pb-10">
                <Link to="/" className="font-mono text-caption text-text-muted">
                    ← { ln("button.backHome") }
                </Link>
                <Eyebrow tone="accent" className="mt-6 mb-3.5">
                    { ln("eyebrow.allWork") }
                </Eyebrow>
                <h1 className="m-0 mb-4 font-extrabold text-[clamp(32px,4.5vw,52px)] leading-[1.08] tracking-tight text-text-primary">
                    { pick(workPage.heading).map((line, index) => (
                        <React.Fragment key={ line }>
                            { index > 0 && <br className="hidden sm:inline"/> }{ " " }
                            { line }
                        </React.Fragment>
                    )) }
                </h1>
                <Text variant="body" tone="muted" className="max-w-[64ch]">
                    { pick(workPage.description) }
                </Text>
            </div>

            <div className="max-w-(--layout-content-narrow) mx-auto px-[clamp(20px,4vw,56px)] pt-6 pb-[100px]">
                <div
                    className={ cn(
                        "hidden sm:grid gap-4 px-5 pb-3",
                        desktopRowGridCols,
                        "font-mono font-semibold text-micro tracking-[0.08em] text-text-faint",
                        "border-b border-border-subtle",
                    ) }
                >
                    <span>{ ln("work.ledger.year") }</span>
                    <span>{ ln("work.ledger.system") }</span>
                    <span>{ ln("work.ledger.stack") }</span>
                    <span className="text-right">{ ln("work.ledger.status") }</span>
                </div>

                { work.sort((a, b) => b.year - a.year).map((item) => (
                    <WorkRow key={ item.slug } item={ item }/>
                )) }
            </div>
        </main>
    );
}
