/**
 * LANDING PAGE — "HOW I WORK" CARDS
 * -----------------------------------
 * Order = display order.
 */
export interface Principle {
    title: string;
    description: string;
}

export const principles: Principle[] = [
    {
        title: "Order over chaos",
        description: "I design the structure so nobody downstream has to think about it.",
    },
    {
        title: "Simplify ruthlessly",
        description: "Every abstraction earns its complexity, or it gets cut.",
    },
    {
        title: "Own the whole pipe",
        description: "From the camera driver to the UI thread — I trace the entire path, not just my layer.",
    },
    {
        title: "Ship, then harden",
        description: "Working software first. Resilience isn't optional — it just comes right after.",
    },
];
