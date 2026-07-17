/**
 * LANDING PAGE — "STACK" ROW
 * ---------------------------
 * Order = display order. `note` shows as a tooltip (title attribute).
 */
export interface TechStackItem {
    name: string;
    note: string;
}

export const techStack: TechStackItem[] = [
    { name: "Kotlin", note: "Primary language for over 6 years" },
    { name: "Coroutines & Flow", note: "Structured concurrency across the whole app" },
    { name: "Jetpack Compose", note: "Declarative UI layer" },
    { name: "Navigation", note: "Custom routing & rendering" },
    { name: "Android Open Source", note: "AOSP customization for OEM device" },
    { name: "Dagger2", note: "Dependency injection" },
    { name: "Camera2", note: "Camera pipeline & capture" },
    { name: "JUnit", note: "Unit & integration testing" },
];
