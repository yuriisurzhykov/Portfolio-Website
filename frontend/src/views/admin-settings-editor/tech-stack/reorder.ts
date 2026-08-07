/**
 * Moves one element to a new index, shifting everything in between —
 * insertion semantics, NOT the swap `fields/ListEditor.tsx` does. For a
 * one-step move the two are identical; for a drag from row 20 to row 1
 * they're completely different, and insertion is the one that matches
 * what dragging a row looks like it should do.
 *
 * Returns the ORIGINAL array reference (not a copy) when the move is a
 * no-op — out of range, or onto itself — so a caller can use identity to
 * skip a pointless state update, and a spurious `dragover` on the row
 * being dragged can't mark the form dirty.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): readonly T[] {
    if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) {
        return items;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}
