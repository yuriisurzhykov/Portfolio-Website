"use client";

import * as React from "react";
import type { HeroContent } from "@portfolio/backend";
import { Card } from "@/shared/ui/card";
import { Text } from "@/shared/ui/text";
import { Checkbox, Field, Input } from "@/shared/ui/form";
import { BilingualField } from "../fields/BilingualField";
import { ListEditor } from "../fields/ListEditor";
import { SettingsFormFooter } from "../fields/SettingsFormFooter";
import { useSiteContentForm } from "../useSiteContentForm";

interface GraphNodeFormState {
    label: string;
    sublabelEn: string;
    sublabelRu: string;
    highlighted: boolean;
}

interface HeroFormState {
    headline: string;
    subheadEn: string;
    subheadRu: string;
    chipsEn: string;
    chipsRu: string;
    graphNodes: GraphNodeFormState[];
}

/** Comma-joined for editing, split back on submit — same convention as `WorkEditorPage`'s `stack` field (`web/src/views/admin-work-editor/WorkEditorPage.tsx`), reused here instead of invented fresh for `headline`/`chips`. */
function joinList(items: string[]): string {
    return items.join(", ");
}

function splitList(value: string): string[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function toFormState(hero: HeroContent): HeroFormState {
    return {
        headline: joinList(hero.headline),
        subheadEn: hero.subhead.en,
        subheadRu: hero.subhead.ru,
        chipsEn: joinList(hero.chips.en),
        chipsRu: joinList(hero.chips.ru),
        graphNodes: hero.graphNodes.map((node) => ({
            label: node.label,
            sublabelEn: node.sublabel.en,
            sublabelRu: node.sublabel.ru,
            highlighted: node.highlighted ?? false,
        })),
    };
}

function toContent(form: HeroFormState): HeroContent {
    return {
        headline: splitList(form.headline),
        subhead: { en: form.subheadEn.trim(), ru: form.subheadRu.trim() },
        chips: { en: splitList(form.chipsEn), ru: splitList(form.chipsRu) },
        graphNodes: form.graphNodes.map((node) => ({
            label: node.label.trim(),
            sublabel: { en: node.sublabelEn.trim(), ru: node.sublabelRu.trim() },
            highlighted: node.highlighted,
        })),
    };
}

export function HeroSettingsForm({ initialData }: { initialData: HeroContent }) {
    const [form, setForm] = React.useState<HeroFormState>(() => toFormState(initialData));
    const { submitting, error, savedAt, submit } = useSiteContentForm("hero");

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        void submit(toContent(form));
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg pb-4xl">
            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <Field label="Headline" htmlFor="headline" hint="Comma-separated lines, e.g. Yurii, Surzhykov — rendered stacked, not localized.">
                    <Input id="headline" required value={form.headline} onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))} />
                </Field>

                <BilingualField
                    label="Subhead"
                    idPrefix="subhead"
                    multiline
                    en={form.subheadEn}
                    ru={form.subheadRu}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, subheadEn: value }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, subheadRu: value }))}
                />

                <BilingualField
                    label="Chips"
                    hint="Comma-separated, e.g. flowbus · shipped, navigation-engine · shipped."
                    idPrefix="chips"
                    en={form.chipsEn}
                    ru={form.chipsRu}
                    onEnChange={(value) => setForm((prev) => ({ ...prev, chipsEn: value }))}
                    onRuChange={(value) => setForm((prev) => ({ ...prev, chipsRu: value }))}
                />
            </Card>

            <Card variant="filled" className="p-lg flex flex-col gap-md">
                <Text as="h2" variant="h5">Graph nodes</Text>
                <ListEditor
                    label="Floating node-graph illustration next to the headline"
                    items={form.graphNodes}
                    onChange={(graphNodes) => setForm((prev) => ({ ...prev, graphNodes }))}
                    createItem={() => ({ label: "", sublabelEn: "", sublabelRu: "", highlighted: false })}
                    addLabel="Add node"
                    renderItem={(node, index, update) => (
                        <div className="flex flex-col gap-sm">
                            <Field label="Label" htmlFor={`node-label-${index}`} hint="Not localized — a proper noun (e.g. Client, FlowBus).">
                                <Input id={`node-label-${index}`} value={node.label} onChange={(e) => update({ label: e.target.value })} />
                            </Field>
                            <BilingualField
                                label="Sublabel"
                                idPrefix={`node-sublabel-${index}`}
                                en={node.sublabelEn}
                                ru={node.sublabelRu}
                                onEnChange={(value) => update({ sublabelEn: value })}
                                onRuChange={(value) => update({ sublabelRu: value })}
                            />
                            <Checkbox label="Highlighted" checked={node.highlighted} onChange={(e) => update({ highlighted: e.target.checked })} />
                        </div>
                    )}
                />
            </Card>

            <SettingsFormFooter submitting={submitting} error={error} savedAt={savedAt} />
        </form>
    );
}
