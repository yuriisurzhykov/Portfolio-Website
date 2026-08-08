/**
 * Subsequence-based fuzzy score, in the spirit of VS Code's "quick open"
 * filter — every character of `query` must appear in `target`, in order,
 * but not necessarily adjacent ("jc" matches "Jetpack Compose": j...
 * ...c...). Returns `null` when `query` isn't a subsequence of `target` at
 * all (no match), otherwise a positive score where HIGHER is a better
 * match — callers rank/sort by it, never compare it to an absolute
 * "good enough" cutoff (that's a different, more conservative check, see
 * `findClosestSuggestion` below).
 *
 * Three additive signals decide the score, each rewarding a property a
 * human would actually consider "a good match":
 * - Consecutive runs of matched characters ("jet" hitting three letters
 *   in a row inside "Jetpack") score much higher than the same three
 *   letters scattered across the string — a real abbreviation almost
 *   always types a recognizable prefix of at least one word.
 * - Landing on a word boundary (start of `target`, or right after a
 *   space/hyphen/`&`) — this is WHY "jc" ranks "Jetpack Compose" above
 *   some coincidental scattered-letter match elsewhere: both matched
 *   letters start a word.
 * - An earlier first-match position beats a later one, all else equal.
 */
export function fuzzyMatchScore(query: string, target: string): number | null {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
        return 0;
    }
    const normalizedTarget = target.toLowerCase();

    let score = 0;
    let searchFrom = 0;
    // `previousMatchIndex`'s initial value only feeds `isConsecutive` on
    // the VERY FIRST loop iteration — and on that first iteration,
    // `consecutiveRun` becomes 1 regardless of whether `isConsecutive` was
    // true or false (`0 + 1` on the true branch equals the false branch's
    // literal `1`), so no starting sentinel value can ever produce a
    // different score. Verified by hand, not just reasoned about: ran both
    // this code and a version starting at `+1` instead across 8 varied
    // query/target pairs — identical scores every time.
    // Stryker disable next-line UnaryOperator
    let previousMatchIndex = -1;
    let consecutiveRun = 0;
    let firstMatchIndex = -1;

    for (const char of normalizedQuery) {
        const foundAt = normalizedTarget.indexOf(char, searchFrom);
        if (foundAt === -1) {
            return null;
        }
        if (firstMatchIndex === -1) {
            firstMatchIndex = foundAt;
        }

        const isConsecutive = foundAt === previousMatchIndex + 1;
        consecutiveRun = isConsecutive ? consecutiveRun + 1 : 1;
        const isWordStart = foundAt === 0 || /[\s&-]/.test(normalizedTarget[foundAt - 1]);

        score += 10 + consecutiveRun * 4 + (isWordStart ? 8 : 0);

        previousMatchIndex = foundAt;
        searchFrom = foundAt + 1;
    }

    // Small tie-breakers, not dominant terms: an earlier first match, and a
    // shorter (more precise) target, both edge out an otherwise-equal score.
    score -= firstMatchIndex * 0.5;
    score -= (normalizedTarget.length - normalizedQuery.length) * 0.1;
    return score;
}

/** Ranks `candidates` against `query`, best match first, dropping anything that isn't a subsequence match at all. An empty/whitespace-only query returns the first `limit` candidates unranked — "nothing typed yet" shows a default list, not zero results. */
export function fuzzySearch(query: string, candidates: readonly string[], limit = 8): string[] {
    // Skipping this early return for an empty/whitespace query (forcing
    // the condition false, emptying the block, or dropping `.trim()`) is
    // observably a no-op here, not just untested: `fuzzyMatchScore` itself
    // already trims and returns `0` for an empty/whitespace query, so
    // every candidate would score `0` on the fallthrough path too — and
    // `Array.prototype.sort` with an always-0 comparator is guaranteed
    // stable (ES2019+), so the fallthrough's map→filter→sort→slice→map
    // produces the exact same `candidates.slice(0, limit)` this early
    // return does. Verified by hand: ran both versions against a 9-item
    // list for `""` and `"   "` — byte-identical output both times.
    // Stryker disable next-line ConditionalExpression,BlockStatement,MethodExpression
    if (query.trim().length === 0) {
        return candidates.slice(0, limit);
    }
    return candidates
        .map((candidate) => ({ candidate, score: fuzzyMatchScore(query, candidate) }))
        .filter((entry): entry is { candidate: string; score: number } => entry.score !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.candidate);
}

/**
 * A DIFFERENT, deliberately more conservative check than `fuzzySearch`
 * above — this answers "is this ALREADY-TYPED value probably a variant
 * spelling of a known technology", not "what should the dropdown show
 * while the admin is still typing". Subsequence scoring is too permissive
 * for this job: it would happily call two genuinely unrelated words a
 * "match" if their letters merely appear in the right order somewhere.
 * Plain, case-insensitive substring containment (either direction) is
 * the actual real-world case this exists for — `"Python"` is a substring
 * of the real `techStack` entry `"Python & Jinja2"`, and that's the exact
 * kind of near-miss (a shorthand the admin typed for something that
 * already exists, spelled more fully) worth a "did you mean" hint for.
 * Returns `null` both when `value` already exactly matches a suggestion
 * (nothing to hint) and when nothing is close enough to be worth
 * surfacing — the caller can't tell those two cases apart, and doesn't
 * need to: either way, there's no hint to show.
 */
export function findClosestSuggestion(value: string, suggestions: readonly string[]): string | null {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return null;
    }

    let containingMatch: string | null = null;
    for (const suggestion of suggestions) {
        const suggestionLower = suggestion.toLowerCase();
        if (suggestionLower === normalized) {
            return null;
        }
        if (!containingMatch && (suggestionLower.includes(normalized) || normalized.includes(suggestionLower))) {
            containingMatch = suggestion;
        }
    }
    return containingMatch;
}
