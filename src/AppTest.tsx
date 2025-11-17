import React from "react";
import {useI18n} from "./i18n/ui/useI18n.tsx";
import {Button} from "./design-system/components/primitives/Button.tsx";

export function AppTest() {
    const {ln, setLocale} = useI18n();
    return (
        <div>
            <div>
                <Button onClick={() => setLocale("en")}>English</Button>
                <Button onClick={() => setLocale("ru")}>Русский</Button>
            </div>

            <div>
                <h1>{ln("hero.title")}</h1>
                <p>{ln("hero.subtitle")}</p>
            </div>
        </div>
    );
}