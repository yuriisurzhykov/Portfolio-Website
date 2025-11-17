import React from "react";

type SectionProps = React.HTMLAttributes<HTMLElement> & {
    title?: string;
    subtitle?: string;
};

export function Section({title, subtitle, className = "", children, ...rest}: SectionProps) {
    return (
        <section className={`w-full max-w-5xl mx-auto ${className}`} {...rest}>
            {(title || subtitle) && (
                <header className="mb-6">
                    {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
                    {subtitle && <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>}
                </header>
            )}
            {children}
        </section>
    );
}