import {Code2, Cpu, FolderGit2, Mail, Menu, Rocket} from "lucide-react";
import React from "react";

// "github"/"linkedin" were dropped here (not just renamed): lucide-react 1.0
// removed all brand-logo icons repo-wide (see its release notes), and this
// map has no actual consumer left to render them anyway — `simple-icons`
// (already a dependency, see `shared/lib/tech-icons/README.md`) is this
// repo's established source for brand logos going forward.
export type IconName =
    | "mail"
    | "menu"
    | "code"
    | "cpu"
    | "repo"
    | "rocket";

export const Icons: Record<IconName, React.FC<React.SVGProps<SVGSVGElement>>> = {
    mail: Mail,
    menu: Menu,
    code: Code2,
    cpu: Cpu,
    repo: FolderGit2,
    rocket: Rocket,
};