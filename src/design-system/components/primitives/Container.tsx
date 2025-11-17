import * as React from "react";
import {classNames} from "../../../utils/classNames.ts";
import {layout} from "../../design/tokens.ts";

export function Container({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={classNames("mx-auto px-6", className)} style={{maxWidth: layout.contentMaxWidth}} {...props} />
    );
}