import * as React from "react";

export type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
    level?: 1 | 2 | 3 | 4;
};

const styles: Record<number, string> = {
    1: "text-4xl md:text-5xl font-extrabold tracking-tight",
    2: "text-3xl md:text-4xl font-bold tracking-tight",
    3: "text-2xl font-semibold",
    4: "text-xl font-semibold",
};

export function Heading({level = 2, className = "", ...rest}: HeadingProps) {
    const Tag = (`h${level}` as unknown) as "h1" | "h2" | "h3" | "h4";
    return <Tag className={`${styles[level]} ${className}`} {...rest} />;
}
