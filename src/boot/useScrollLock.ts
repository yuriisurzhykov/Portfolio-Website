import {useEffect} from "react";

export function useScrollLock(active: boolean) {
    useEffect(() => {
            const {style} = document.documentElement;
            const prev = style.overflow;
            if (active) {
                style.overflow = "hidden";
            }
            return () => {
                style.overflow = prev;
            }
        },
        [active]
    )
}