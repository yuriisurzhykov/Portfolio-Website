import * as React from "react";
import { forwardRef } from "react";
import { cn } from "@/shared/lib";

export type HeaderLevel = 1 | 2 | 3 | 4 | 5;

export type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
    level?: HeaderLevel;
};

const styles: Record<HeaderLevel, string> = {
    1: "text-5xl md:text-5xl font-extrabold tracking-tight",
    2: "text-4xl md:text-4xl font-bold tracking-tight",
    3: "text-3xl font-semibold",
    4: "text-2xl font-semibold",
    5: "text-xl font-medium"
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
    ({ level = 2, className = "", ...rest }: HeadingProps) => {
        const Tag = (`h${level}` as unknown) as "h1" | "h2" | "h3" | "h4" | "h5";
        return <Tag className={cn(className, styles[level])} {...rest} />;
    }
);

Heading.displayName = "Heading";