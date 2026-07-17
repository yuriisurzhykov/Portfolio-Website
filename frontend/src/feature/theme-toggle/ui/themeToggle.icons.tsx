import type { JSX } from "react";
import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

export function SunIcon(props: IconProps): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            {...props}
        >
            <circle cx="12" cy="12" r="4.25" />
            <path
                d="M12 2.5v2.5M12 19v2.5M4.22 4.22l1.77 1.77M17.99 17.99l1.79 1.79M2.5 12H5M19 12h2.5M4.22 19.78l1.77-1.77M17.99 6.01l1.79-1.79" />
        </svg>
    );
}

export function SystemIcon(props: IconProps): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            {...props}
        >
            <rect x="3" y="5" width="18" height="12" rx="2.25" />
            <rect x="8" y="17.5" width="8" height="1.75" rx="0.75" />
        </svg>
    );
}

export function MoonIcon(props: IconProps): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            {...props}
        >
            <path
                d="M18.5 14.5A7.25 7.25 0 0 1 10 6a7.2 7.2 0 0 1 1.34-4A7.5 7.5 0 1 0 20 15.34 7.22 7.22 0 0 1 18.5 14.5z" />
        </svg>
    );
}
