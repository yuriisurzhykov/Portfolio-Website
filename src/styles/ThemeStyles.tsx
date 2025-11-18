import * as React from "react";
import {themeVars} from "../design-system/design/theme.css.ts";

export function ThemeStyles() {
    React.useEffect(() => {
            const style = document.createElement("style");
            style.setAttribute("data-theme", "app");
            style.textContent = themeVars;
            document.head.appendChild(style);
            return () => {
                document.head.removeChild(style);
            };
        },
        []
    );
    return null;
}