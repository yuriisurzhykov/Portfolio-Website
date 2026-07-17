/**
 * WORK / PROJECTS
 * ----------------
 * Single source of truth for every project — powers the landing "Selected
 * Work" grid, the /work ledger, and (when `caseStudy` is present) the
 * /work/:slug case-study page.
 *
 * To add a project: append an object to this array. To reorder: reorder
 * the array. To feature it on the landing page: set `featured: true`.
 * `stack` holds the full tech list; compact views (ledger row, landing
 * card) just show the first couple of entries.
 */

export type WorkStatus = "shipped" | "in-progress";

export interface WorkApproachItem {
    title: string;
    description: string;
}

export interface WorkCaseStudy {
    startedLabel: string;
    shippedLabel: string;
    role: string;
    heroImage?: string;
    sections: { heading: string; body: string }[];
    approach?: WorkApproachItem[];
}

export interface WorkItem {
    slug: string;
    title: string;
    year: number;
    status: WorkStatus;
    /** Card / ledger-row description. */
    summary: string;
    stack: string[];
    coverImage?: string;
    /** Show on the landing page's "Selected Work" grid. */
    featured?: boolean;
    /** Cross-link to a journal post ("Read the story →" / related-entry card). */
    relatedPostSlug?: string;
    /** Present only for projects with a full /work/:slug case-study page. */
    caseStudy?: WorkCaseStudy;
}

export const work: WorkItem[] = [
    {
        slug: "camera-pipeline",
        title: "Camera Pipeline",
        year: 2026,
        status: "in-progress",
        summary:
            "Real-time capture and processing pipeline for Android Automotive camera systems — currently in active development.",
        stack: ["Kotlin", "CameraX", "Coroutines"],
        featured: true,
    },
    {
        slug: "navigation-engine",
        title: "Navigation Engine",
        year: 2024,
        status: "shipped",
        summary:
            "A custom routing and rendering engine built from scratch — the system I'm proudest of.",
        stack: ["Kotlin", "Coroutines & Flow", "Custom Rendering", "Android Automotive"],
        featured: true,
        relatedPostSlug: "flowbus",
        caseStudy: {
            startedLabel: "Mar 2024",
            shippedLabel: "Nov 2024",
            role: "Sole engineer",
            sections: [
                {
                    heading: "Overview",
                    body: "A routing and rendering engine built from scratch for in-vehicle navigation — the system I'm proudest of on this stack. It owns route calculation, map tile rendering, and turn-by-turn state, and communicates with the rest of the app entirely through FlowBus, the event framework built alongside it.",
                },
                {
                    heading: "The challenge",
                    body: "Off-the-shelf navigation SDKs didn't fit the constraints of the target hardware — limited memory, a fixed frame budget, and a need for the rendering layer to share state cleanly with camera and UI modules running in the same process. The engine needed to be small, predictable under load, and easy for other engineers to extend without touching its internals.",
                },
            ],
            approach: [
                {
                    title: "Routing",
                    description: "Graph-based route calculation, isolated from rendering concerns.",
                },
                {
                    title: "Rendering",
                    description: "Custom tile compositor tuned to the device's frame budget.",
                },
                {
                    title: "State & messaging",
                    description:
                        "Turn-by-turn state published over FlowBus for any module to consume.",
                },
            ],
        },
    },
    {
        slug: "flowbus",
        title: "FlowBus",
        year: 2023,
        status: "shipped",
        summary:
            "An event-bus framework that decouples modules without the usual boilerplate. Quietly powers everything else I build.",
        stack: ["Kotlin", "Flow"],
        featured: true,
        relatedPostSlug: "flowbus",
    },
];
