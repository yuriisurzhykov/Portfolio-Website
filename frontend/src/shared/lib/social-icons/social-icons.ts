import { getSimpleIconBySlug } from "@/shared/lib/tech-icons/registry";
import type { TechIconView } from "@/shared/lib/tech-icons";

export interface SocialIcons {
    github: TechIconView;
    linkedin: TechIconView;
}

function resolveBrandIcon(slug: string): TechIconView {
    const found = getSimpleIconBySlug(slug);
    return found ? { kind: "path", rawSvg: found.path, title: found.title } : { kind: "none" };
}

export function resolveSocialIcon(): SocialIcons {
    return {
        github: resolveBrandIcon("github"),
        linkedin: resolveBrandIcon("linkedin"),
    };
}