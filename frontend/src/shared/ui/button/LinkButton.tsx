import * as React from "react";
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib";
import { buttonBaseStyles, buttonSizeClasses, buttonVariantClasses } from "./Button";
import type { ButtonSize, ButtonVariant } from "./Button.types";

export type LinkButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
};

/**
 * LinkButton
 * ----------
 * A navigational CTA that looks exactly like <Button/> but is a link, not
 * a <button>. Same-page anchors ("#work") and external/mailto links render
 * as a plain <a>; app routes ("/work/...") render as a client-side
 * react-router <Link> so navigating between pages doesn't reload the app.
 */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
    ({className, variant = "primary", size = "md", fullWidth, href, children, ...rest}, ref) => {
        const classes = cn(
            buttonBaseStyles,
            buttonSizeClasses[size],
            buttonVariantClasses[variant],
            fullWidth && "w-full",
            className,
        );

        const isInternalRoute = href.startsWith("/");

        if (isInternalRoute) {
            return (
                <Link ref={ ref } to={ href } className={ classes } { ...rest }>
                    { children }
                </Link>
            );
        }

        return (
            <a ref={ ref } href={ href } className={ classes } { ...rest }>
                { children }
            </a>
        );
    },
);

LinkButton.displayName = "LinkButton";
