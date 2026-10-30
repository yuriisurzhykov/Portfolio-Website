# Content URL editing

## 2026-10-29 Publication is the automatic URL boundary

The URL reducer distinguishes canonical resource identity, the draft candidate, persisted auto/manual mode and publication history. Saving or reloading a never-published draft does not freeze automatic title-derived candidates. Explicit manual edits do. Publication freezes automatic changes permanently, including after unpublish.

The server resolves uniqueness and persists mode. The view supplies acknowledgement state; this feature neither picks an API endpoint nor mutates a live address. Its dialog creates a pending manual edit and cancellation leaves the policy unchanged. Existing public URLs remain stable until explicit publication applies a rename.
