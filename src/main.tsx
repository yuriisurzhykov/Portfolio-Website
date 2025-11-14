import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";
import "./styles/globals.css";

import {registerLocale, setLocale} from "./i18n/i18n.ts";
import enLocale from "../public/locales/en/translation.json";
import ruLocale from "../public/locales/ru/translation.json";

registerLocale("en", enLocale);
registerLocale("ru", ruLocale);

setLocale("en");

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);