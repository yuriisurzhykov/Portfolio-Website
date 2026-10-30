import type { RelatedItemOption } from "@/shared/ui/related-item-picker";

export interface JournalPropertiesValue {
    title: string;
    category: string;
    excerpt: string;
    relatedWorkSlug: string;
}
export interface WorkPropertiesValue {
    title: string;
    summary: string;
    date: string;
    stack: string[];
    coverImage: string;
    relatedPostSlug: string;
    hasCaseStudy: boolean;
    startedLabel: string;
    shippedLabel: string;
    role: string;
    heroImage: string;
}
export type PropertyChange<T> = <K extends keyof T>(key: K, value: T[K]) => void;
export interface PropertyOptions {
    options: RelatedItemOption[];
    disabled?: boolean;
}
