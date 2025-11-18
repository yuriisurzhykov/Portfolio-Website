import * as React from "react";
import {Heading} from "./Heading.tsx";

export type SectionProps = React.HTMLAttributes<HTMLElement> & {
    title?: string;
    eyebrow?: string;
    subtitle?: string;
    id?: string;
};

export function Section({className = "", title, eyebrow, subtitle, id = "", children, ...props}: SectionProps) {
    return (
        <section
            id={id}
            className={`w-full px-lg py-2xl flex justify-center ${className}`}
            {...props}>
            <div className="w-full max-w-[1160px]">
                {(title || eyebrow || subtitle) && (
                    <header className="mb-xl">
                        {eyebrow && (
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-(--color-muted)">
                                {eyebrow}
                            </p>
                        )}
                        {title && (
                            <Heading level={1}>{title}</Heading>
                        )}
                        {subtitle && (
                            <p className="mt-sm text-sm text-(--color-muted)">{subtitle}</p>
                        )}
                    </header>
                )}
                {children}
            </div>
        </section>
    );
}