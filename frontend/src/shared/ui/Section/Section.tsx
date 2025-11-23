import * as React from "react";
import { forwardRef } from "react";
import { Heading } from "@/shared/ui/Heading";

export type SectionProps = React.HTMLAttributes<HTMLElement> & {
    title?: string;
    eyebrow?: string;
    subtitle?: string;
    id?: string;
};

export const Section = forwardRef<HTMLElement, SectionProps>(
    ({
         className = "",
         title,
         eyebrow,
         subtitle,
         id = "",
         children,
         ...props
     }: SectionProps) => {
        return (
            <section
                id={id}
                className={`w-full px-lg py-2xl flex justify-center ${className}`}
                {...props}>
                <div className="w-full max-w-[1160px]">
                    {(title || eyebrow || subtitle) && (
                        <header className="mb-xl">
                            {eyebrow && (
                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                                    {eyebrow}
                                </p>
                            )}
                            {title && (
                                <Heading level={1}>{title}</Heading>
                            )}
                            {subtitle && (
                                <p className="mt-sm text-sm text-muted">{subtitle}</p>
                            )}
                        </header>
                    )}
                    {children}
                </div>
            </section>
        );
    });

Section.displayName = "Section";