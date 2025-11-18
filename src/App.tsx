import {Button} from "./design-system/components/Button.tsx";
import React from "react";
import {Input} from "./design-system/components/Input.tsx";
import {Section} from "./design-system/components/Section.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "./design-system/components/Card.tsx";

type Project = { id: number; title: string; tag: string; };

export default function App() {
    const [projects, setProjects] = React.useState<Project[]>([
        {id: 1, title: "FlowBus", tag: "events"},
        {id: 2, title: "NavSymphony", tag: "navigation"},
    ]);
    const [title, setTitle] = React.useState("");
    const [tag, setTag] = React.useState("");

    const add = () => {
        if (!title.trim()) return;
        setProjects((prev) => [
            ...prev,
            {id: Date.now(), title: title.trim(), tag: tag.trim() || "misc"},
        ]);
        setTitle("");
        setTag("");
    };

    const remove = (id: number) => setProjects((p) => p.filter((x) => x.id !== id));

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100 py-10">
            <Section title="Portfolio Projects" subtitle="Маленькая проверочная сцена дизайн-системы">
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Add project</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
                            <Input label="Title" placeholder="Project title" value={title}
                                   onChange={e => setTitle(e.currentTarget.value)} />
                            <Input label="Tag" placeholder="events / navigation / ui" value={tag}
                                   onChange={e => setTag(e.currentTarget.value)} />
                            <div className="flex items-end">
                                <Button onClick={add} className="w-full">Add</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map(p => (
                        <Card key={p.id}>
                            <CardHeader>
                                <CardTitle>{p.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-neutral-400">Tag: <span
                                    className="text-cyan-400">{p.tag || "—"}</span></p>
                                <div className="mt-4 flex gap-2">
                                    <Button variant="secondary" size="sm">Open</Button>
                                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>Remove</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </Section>
        </main>
    );
}
