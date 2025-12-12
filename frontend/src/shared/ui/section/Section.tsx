import * as React from "react";
import { forwardRef } from "react";
import { Text } from "@/shared/ui/text";

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
     }: SectionProps, ref) => {
        return (
            <section
                ref={ref}
                id={id}
                className={`w-full px-lg py-2xl flex justify-center ${className}`}
                {...props}>
                <div className="w-full max-w-[1160px]">
                    {(title || eyebrow || subtitle) && (
                        <header className="mb-xl">
                            {eyebrow && (
                                <Text variant="caption" tone="muted">{eyebrow}</Text>
                            )}
                            {title && (
                                <Text variant="h1">{title}</Text>
                            )}
                            {subtitle && (
                                <Text variant="caption" tone="muted">{subtitle}</Text>
                            )}
                        </header>
                    )}
                    {children}
                </div>
            </section>
        );
    });

Section.displayName = "Section";