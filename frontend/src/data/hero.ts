/**
 * LANDING PAGE — HERO
 * --------------------
 * headline is rendered as two stacked lines (first/last name); everything
 * else maps straight onto the section as written.
 */

export interface HeroGraphNode {
    label: string;
    sublabel: string;
    highlighted?: boolean;
}

export const hero: {
    headline: string[];
    subhead: string;
    chips: string[];
    graphNodes: HeroGraphNode[];
} = {
    headline: ["Yurii", "Surzhykov"],
    subhead:
        "I design the systems other engineers build on top of — embedded Android, AsyncAPI compiler, Dev tools, navigation framework, camera pipelines.",
    chips: [
        "camera-pipeline · in progress",
        "navigation-engine · shipped",
        "flowbus · shipped",
    ],
    /** Floating node-graph illustration next to the headline. */
    graphNodes: [
        {label: "Client", sublabel: "Android · OEM · AOSP"},
        {label: "Navigation Engine", sublabel: "route · rendering", highlighted: true},
        {label: "FlowBus", sublabel: "event bus · pub/sub · Kotlin"},
    ],
};
