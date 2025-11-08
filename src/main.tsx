import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";
import "./styles/globals.css";

import {registerLocale, setLocale} from "./i18n/i18n.ts";
import enLocale from "./i18n/locales/en.json";
import ruLocale from "./i18n/locales/ru.json";

registerLocale("en", enLocale);
registerLocale("ru", ruLocale);

setLocale("en");

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
);