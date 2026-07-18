import * as React from "react";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { Tag } from "@/shared/ui/tag";
import { useTranslation } from "@/shared/i18n";
import { techStack } from "@/data/techStack";

export function TechStack() {
    const { ln, pick } = useTranslation();

    return (
        <section className="max-w-[var(--layout-content-max-width)] mx-auto px-[clamp(20px,4vw,56px)] pb-[clamp(56px,7vw,80px)]">
            <Eyebrow className="mb-[20px]">{ln("eyebrow.stack")}</Eyebrow>
            <div className="flex flex-wrap gap-[12px]">
                {techStack.map((item) => (
                    <Tag key={item.name} variant="neutral" size="md" title={pick(item.note)} className="cursor-default">
                        {item.name}
                    </Tag>
                ))}
            </div>
        </section>
    );
}
