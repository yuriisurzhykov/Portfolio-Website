import {Code2, Cpu, FolderGit2, Github, Linkedin, Mail, Menu, Rocket} from "lucide-react";
import React from "react";

export type IconName =
    | "github"
    | "linkedin"
    | "mail"
    | "menu"
    | "code"
    | "cpu"
    | "repo"
    | "rocket";

export const Icons: Record<IconName, React.FC<React.SVGProps<SVGSVGElement>>> = {
    github: Github,
    linkedin: Linkedin,
    mail: Mail,
    menu: Menu,
    code: Code2,
    cpu: Cpu,
    repo: FolderGit2,
    rocket: Rocket,
};