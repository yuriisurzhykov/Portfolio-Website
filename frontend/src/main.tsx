import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import { Root } from "./Root.tsx";
import { initI18n } from "./shared/i18n/engine";
import { I18nProvider } from "@/shared/i18n";

await initI18n();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <I18nProvider>
            <Root />
        </I18nProvider>
    </React.StrictMode>
);