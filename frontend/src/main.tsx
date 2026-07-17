import React from "react";
import ReactDOM from "react-dom/client";
import "@/app/styles/index.css";
import { Root } from "./Root.tsx";
import { initI18n } from "./shared/i18n/engine";
import { MainProviders } from "@/app/providers/MainProviders.tsx";

await initI18n();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <MainProviders>
            <Root />
        </MainProviders>
    </React.StrictMode>
);