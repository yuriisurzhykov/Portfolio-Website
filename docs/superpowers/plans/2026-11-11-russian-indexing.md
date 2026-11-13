# Russian content and indexing repair

Goal: publish independent Russian translations of all twelve current detail pages and correct the signals used to discover and identify them.

Architecture: preserve the existing locale routes and independent Russian Documents. Apply reviewed content through a guarded PostgreSQL data migration during the normal deployment. Sitemap entries and structured data must agree with the page canonical.

Constraints: preserve English content, stable slugs, code and diagrams. Do not overwrite existing translations or unpublished drafts. No direct production changes or merge. Indexing decisions in Search Console cannot be verified with repository access.

- [x] Add regression tests that fail when sitemap omits translated URLs; generate reciprocal entries for every available locale.
- [x] Use localized canonical and breadcrumb URLs in Russian structured data; verify English fallback identifies its actual language and advertises only existing OG locales.
- [x] Translate six posts and six case studies in full. Validate source snapshots, structure, technical content and metadata.
- [x] Generate and verify a transactional data migration that applies only to matching, published, untranslated records without drafts. Preserve all other records and make retries safe.
- [x] Run frontend tests, type checks, build and migration checks. Review complete diff and create a pull request with deployment and Search Console limits.

Review focus: reciprocal hreflang entries, unchanged English documents, edited source/draft protection, migration retry behavior, and Russian article identity.

Validation: frontend 536/536; backend 791/791 on PostgreSQL 18.6; both TypeScript projects; Next.js production build; real HTTP checks of all 30 sitemap URLs after data migration. Independent review found an unavailable Open Graph locale issue, corrected with a failing-then-passing regression test.

Scope decision: preserve every existing translation and pending draft. Such records are skipped with a notice during deployment, rather than overwritten from a captured public snapshot.
