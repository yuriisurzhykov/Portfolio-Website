import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;


export function Card({className = "", ...props}: CardProps) {
    return (
        <div
            className={`rounded-2xl bg-neutral-900/80 border-neutral-800 shadow-lg ${className}`}
            {...props}
        ></div>
    );
}

export function CardHeader({className = "", ...props}: CardProps) {
    return <div className={`px-5 pt-5 ${className}`} {...props} />;
}

export function CardTitle({className = "", ...props}: CardProps) {
    return <h3 className={`text-xl font-semibold ${className}`} {...props} />;
}

export function CardContent({className = "", ...props}: CardProps) {
    return <div className={`px-5 pb-5 pt-2 text-sm text-neutral-300 ${className}`} {...props} />;
}