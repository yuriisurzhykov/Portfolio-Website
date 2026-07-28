import type {
    ConfigContent,
    ContactContent,
    HeroContent,
    JournalPageContent,
    PrinciplesContent,
    TechStackContent,
    WorkPageContent,
} from "@portfolio/backend";
import { HeroSettingsForm } from "./forms/HeroSettingsForm";
import { HeadingDescriptionSettingsForm } from "./forms/HeadingDescriptionSettingsForm";
import { PrinciplesSettingsForm } from "./forms/PrinciplesSettingsForm";
import { TechStackSettingsForm } from "./forms/TechStackSettingsForm";
import { ConfigSettingsForm } from "./forms/ConfigSettingsForm";
import { WorkPageSettingsForm } from "./forms/WorkPageSettingsForm";

/**
 * A real discriminated union, not `{ settingsKey: SiteContentKey;
 * initialData: SiteContentDataMap[SiteContentKey] }` — the latter would
 * let `initialData` be, say, `TechStackContent` while `settingsKey` is
 * `"hero"`, since the two properties' generic types wouldn't be tied
 * together. Discriminating on `settingsKey` here means the `switch` below
 * narrows `initialData` to the exact right shape per case with no cast
 * inside this file — only the Server Component that constructs this prop
 * (`app/admin/(dashboard)/settings/[key]/page.tsx`) needs one, at the one
 * point where a route param string genuinely becomes this union (see its
 * comment for why that's safe).
 */
export type SettingsEditorPageProps =
    | { settingsKey: "hero"; initialData: HeroContent }
    | { settingsKey: "contact"; initialData: ContactContent }
    | { settingsKey: "principles"; initialData: PrinciplesContent }
    | { settingsKey: "techStack"; initialData: TechStackContent }
    | { settingsKey: "config"; initialData: ConfigContent }
    | { settingsKey: "journalPage"; initialData: JournalPageContent }
    | { settingsKey: "workPage"; initialData: WorkPageContent };

/**
 * Dispatches to one of 7 small, per-section forms — Open/Closed at the
 * section level: adding an 8th `SiteContentKey` is a new `case` here plus
 * one new form component, not a change to any of the existing 7 (mirrors
 * `BlockEditor`'s per-type block components, same reasoning).
 */
export function SettingsEditorPage(props: SettingsEditorPageProps) {
    switch (props.settingsKey) {
        case "hero":
            return <HeroSettingsForm initialData={props.initialData} />;
        case "contact":
        case "journalPage":
            return <HeadingDescriptionSettingsForm settingsKey={props.settingsKey} initialData={props.initialData} />;
        case "principles":
            return <PrinciplesSettingsForm initialData={props.initialData} />;
        case "techStack":
            return <TechStackSettingsForm initialData={props.initialData} />;
        case "config":
            return <ConfigSettingsForm initialData={props.initialData} />;
        case "workPage":
            return <WorkPageSettingsForm initialData={props.initialData} />;
    }
}
