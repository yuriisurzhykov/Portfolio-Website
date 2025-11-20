import * as React from "react";
import { Section } from "@/shared/ui/Section";
import { Surface } from "@/shared/ui/Surface";
import { Text } from "@/shared/ui/Text";
import projects from "./../data/projects.json";

export function ProjectsGrid() {
    return (
        <Section id="projects" title="Selected Work"
                 subtitle="Event-driven middleware, navigation frameworks, system apps">
            <div className="grid gap-[--space-lg] md:grid-cols-2">
                {projects.map((p: { slug: any; title: any; description: any; link: any; }) => (
                    <Surface key={p.slug} className="p-[--space-xl]">
                        <Text as="h3" variant="h3" className="mb-[--space-sm]">{p.title}</Text>
                        <Text as="p" variant="body"
                              className="text-[--color-muted] mb-[--space-md]">{p.description}</Text>
                        {p.link && (
                            <a href={p.link} className="underline">View</a>
                        )}
                    </Surface>
                ))}
            </div>
        </Section>
    );
}