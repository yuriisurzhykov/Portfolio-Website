import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import {I18nProvider} from "./i18n/ui/I18nProvider.tsx";
import {initI18n} from "./i18n/i18n.ts";
import {Root} from "./Root.tsx";

await initI18n();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <I18nProvider>
            <Root />
        </I18nProvider>
    </React.StrictMode>
);