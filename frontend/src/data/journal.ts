import type { ContentBlock } from "@/shared/ui/content-blocks";

/**
 * JOURNAL / BLOG
 * ---------------
 * Powers the landing "From the Journal" preview, the /journal commit-log,
 * and (when `body` is present) the /journal/:slug post page.
 *
 * To publish a new post: append an object with a `body` block array. To
 * announce a draft without writing it yet: append one without `body` and
 * `status: "upcoming"`.
 */

export interface JournalPost {
    slug: string;
    /** ISO date; formatted per-view (log entry vs. post meta). */
    date: string;
    /** Override for irregular dates (e.g. a month-only "upcoming" stub). */
    dateLabel?: string;
    title: string;
    category: string;
    readMins: number;
    excerpt: string;
    status: "published" | "upcoming";
    relatedWorkSlug?: string;
    body?: ContentBlock[];
}

const flowBusBody: ContentBlock[] = [
    {
        type: "lead",
        text: "Every module in the app wanted to talk to every other module. I was tired of writing the same listener interface for the twentieth time — so I built the thing I actually needed.",
    },
    {type: "heading", text: "The problem"},
    {
        type: "paragraph",
        text: "As the app grew, features stopped being independent. The camera module needed to tell the navigation module about a captured frame; the navigation module needed to tell the UI layer about a route change; the UI layer needed to tell everyone about a lifecycle event. Direct references between modules turned every change into a small refactor across the codebase.",
    },
    {
        type: "paragraph",
        text: "The usual fix is an event bus. The usual event bus is a pile of boilerplate: a listener interface per event type, manual registration and unregistration, and a subtle memory leak waiting for the one screen where you forget to unsubscribe.",
    },
    {type: "heading", text: "The idea"},
    {
        type: "paragraph",
        text: "Kotlin already gives you a typed, cancellable, structured stream: Flow. FlowBus is a thin layer on top of a shared SharedFlow that lets any module publish a typed event and any module subscribe to exactly the type it cares about — no interfaces, no manual unregistration, and subscriptions that die with their coroutine scope automatically.",
    },
    {
        type: "code",
        filename: "FlowBus.kt",
        language: "kotlin",
        code: `object FlowBus {
    private val _events = MutableSharedFlow<Any>(extraBufferCapacity = 16)

    fun publish(event: Any) = _events.tryEmit(event)

    inline fun <reified T> subscribe(): Flow<T> =
        _events.filterIsInstance<T>()
}

// Anywhere in the app:
FlowBus.publish(FrameCaptured(id))

scope.launch {
    FlowBus.subscribe<FrameCaptured>().collect { event ->
        renderPreview(event.id)
    }
}`,
    },
    {type: "heading", text: "What it changed"},
    {
        type: "paragraph",
        text: "Modules stopped knowing about each other by name. Adding a new subscriber for an existing event became a one-line change, with zero coordination needed with the publisher. And because every subscription rides on a coroutine scope, screens that get destroyed simply stop listening — no manual cleanup, no leaked callbacks.",
    },
    {
        type: "paragraph",
        text: "FlowBus now quietly carries messages between the camera pipeline, the navigation engine, and the UI layer of this same portfolio's real-world counterpart — the app I build this system for.",
    },
];

export const journal: JournalPost[] = [
    {
        slug: "flowbus",
        date: "2026-02-11",
        title: "Why I Built FlowBus: An Event Bus Without the Boilerplate",
        category: "Architecture",
        readMins: 6,
        excerpt:
            "Every module wanted to talk to every other module, and I was tired of writing the same listener interfaces. Here's the system I built instead — and why it's held up.",
        status: "published",
        relatedWorkSlug: "navigation-engine",
        body: flowBusBody,
    },
    {
        slug: "camera-pipeline-notes",
        date: "2026-03-01",
        dateLabel: "2026-03",
        title: "Notes from the Camera Pipeline — draft",
        category: "Camera",
        readMins: 0,
        excerpt: "Currently in progress. Check back soon.",
        status: "upcoming",
    },
];
