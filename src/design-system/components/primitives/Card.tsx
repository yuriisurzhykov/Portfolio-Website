import * as React from "react";
import {cn} from "../../../utils/cn";

export function Card({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-[--radius-xl] bg-[--color-surface] border border-[--color-border] shadow-[--shadow-soft]",
                className
            )}
            {...props}
        />
    );
}