"use client"

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

export interface DiagramLightboxProps {
    open: boolean,
    onClose: () => void,
    /**
     * Already-rendered SVG markup — same string the thumbnail shows, just bigger and pannable.
     * */
    svg: string,
}

/**
 * Full-screen pan/zoom viewer for a rendered diagram. Same portal/scroll-
 * lock/Escape mechanics as shared/ui/drawer/Drawer.tsx (see its README for
 * why these need to be exactly right) — centered instead of edge-anchored,
 * with react-zoom-pan-pinch's TransformWrapper standing in for a slide
 * transform. Buttons are always visible (not hover-only) and sized for a
 * touch target, since Escape/hover don't exist on mobile.
 */
export function DiagramLightbox({open, onClose, svg}: DiagramLightboxProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!mounted || !open) {
        return null;
    }

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Diagram viewer" className="fixed inset-0 z-overlay">
            <div className="absolute inset-0 bg-overlay-scrim" onClick={ onClose } aria-hidden="true"/>
            <TransformWrapper initialScale={ 1 } minScale={ 0.5 } maxScale={ 6 } centerOnInit
                              doubleClick={ {mode: "reset"} }>
                { ({zoomIn, zoomOut, resetTransform}) => (
                    <>
                        <div className="absolute top-md right-md z-10 flex gap-xs">
                            <button
                                type="button"
                                onClick={ () => zoomIn() }
                                aria-label="Zoom in"
                                className="h-11 w-11 flex items-center justify-center rounded-md bg-surface-base border border-border-default text-text-primary"
                            >
                                <ZoomIn size={ 20 }/>
                            </button>
                            <button
                                type="button"
                                onClick={ () => zoomOut() }
                                aria-label="Zoom out"
                                className="h-11 w-11 flex items-center justify-center rounded-md bg-surface-base border border-border-default text-text-primary"
                            >
                                <ZoomOut size={ 20 }/>
                            </button>
                            <button
                                type="button"
                                onClick={ () => resetTransform() }
                                aria-label="Reset zoom"
                                className="h-11 w-11 flex items-center justify-center rounded-md bg-surface-base border border-border-default text-text-primary"
                            >
                                <RotateCcw size={ 20 }/>
                            </button>
                            <button
                                type="button"
                                onClick={ onClose }
                                aria-label="Close diagram viewer"
                                className="h-11 w-11 flex items-center justify-center rounded-md bg-surface-base border border-border-default text-text-primary"
                            >
                                <X size={ 20 }/>
                            </button>
                        </div>
                        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!block !w-full !h-full">
                            <div className="flex h-full w-full items-center justify-center">
                                <div className="w-full [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
                            </div>
                        </TransformComponent>
                    </>
                ) }
            </TransformWrapper>
        </div>,
        document.body,
    );
}