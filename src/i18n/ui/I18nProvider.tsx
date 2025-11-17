import React, {useEffect, useState} from "react";
import {I18nContext} from "./I18nContext.tsx";
import {ln as lnEngine, setLocale, setLocale as setLocaleEngine} from "../i18n.ts";

type Props = {
    children: React.ReactNode;
}

export function I18nProvider({children}: Props) {
    const [locale, setLocaleState] = useState("en");

    useEffect(() => {
        async function init() {
            setLocale("en");
            setLocaleState("en");
        }

        void init();
    }, []);

    const changeLocale = (code: string) => {
        setLocaleState(code);
        setLocaleEngine(code);
    };

    const contextValue = {
        locale,
        setLocale: changeLocale,
        ln: lnEngine,
    };

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
        </I18nContext.Provider>
    );
}