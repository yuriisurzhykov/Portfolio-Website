# Localization and indexing audit, 2026-11-11

The production sitemap at https://yuriisoft.me/sitemap.xml was valid UTF-8 XML and returned HTTP 200. It listed three English landing/list URLs, six posts, and six project case studies. Russian landing/list URLs appeared only as alternate links; none of the twelve detail records advertised a Russian body. All twelve English detail responses contained self-referencing canonical URLs and `index, follow` metadata. robots.txt allowed the public site. These observations do not establish Google's URL-specific exclusion reasons; Search Console data was unavailable.

## Changes

- Translate all twelve public detail documents, including localized metadata, with all 800 blocks retained. Technical code, diagram source, URLs, and stable slugs stay unchanged.
- Emit a separate sitemap entry for every available language URL, each with reciprocal `en`, `ru`, and `x-default` alternates. Missing translations remain excluded from the Russian sitemap set.
- Match Russian article identity and breadcrumb URLs to the canonical URL. Describe English fallback content as English, and advertise only available Open Graph locales.

## Deployment

The existing deployment runs `prisma migrate deploy` before switching releases. Migration `20261112000000_backfill_russian_content` creates independent Russian Documents and updates Russian metadata in one transaction. It compares every English metadata field and every ordered body block against the reviewed source snapshot.

Existing translations, non-public records, changed English sources, and records with pending drafts are skipped, with a PostgreSQL notice explaining the skip. English documents, URLs, publication dates, and drafts are preserved. Re-executing the SQL does not duplicate translations. Missing records in empty development/CI databases are harmless.

The migration is generated from `backend/content-translations/ru/*.json`. Verify reproducibility with `node backend/scripts/build-russian-content-migration.mjs --check`. If records are skipped during deployment, the affected translation packs need review against their current content before a subsequent data migration can apply them.

Changes are available on the live production domain only after the normal production release. Neither a corrected sitemap nor an indexing request guarantees indexing. No Search Console submission was made in this task.

## Verification

Frontend tests, backend tests on PostgreSQL, TypeScript checks, and the Next.js production build are recorded in the pull request. HTTP checks against the production build use all twelve captured source documents after migration and verify the thirty English/Russian sitemap URLs, canonical URLs, metadata, locale, and JSON-LD identity.

References:

- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/help/crawling-index-faq
