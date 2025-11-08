import * as React from "react";
import {cn} from "../../../utils/cn";
import {layout} from "../../tokens";

export function Container({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("mx-auto px-6", className)} style={{maxWidth: layout.contentMaxWidth}} {...props} />
    );
}