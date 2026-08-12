-- Rename CategoryHue -> IdentityHue, generalizing it to hold BOTH post
-- categories and Work items on one shared ordinal sequence (see
-- backend/src/media/README.md's dated entry and the "Work Item Covers &
-- Unified Identity Hue" plan). Existing rows keep their hue/ordinal exactly
-- as assigned; they simply gain kind="category" and key=<old category>.
ALTER TABLE "CategoryHue" RENAME TO "IdentityHue";
ALTER TABLE "IdentityHue" RENAME COLUMN "category" TO "key";
ALTER TABLE "IdentityHue" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'category';
-- No row must silently keep relying on the default going forward — every
-- future INSERT (resolveCategoryHue/resolveWorkHue) always sets `kind`
-- explicitly.
ALTER TABLE "IdentityHue" ALTER COLUMN "kind" DROP DEFAULT;

DROP INDEX "CategoryHue_category_key";
CREATE UNIQUE INDEX "IdentityHue_kind_key_key" ON "IdentityHue"("kind", "key");
ALTER INDEX "CategoryHue_ordinal_key" RENAME TO "IdentityHue_ordinal_key";
ALTER TABLE "IdentityHue" RENAME CONSTRAINT "CategoryHue_pkey" TO "IdentityHue_pkey";

-- Work.title: String -> Json ({en, ru}, same shape as Post.title). Never
-- exposed by WorkTranslatePage before this migration, so every existing
-- row's Russian half is genuinely empty, not lost data.
ALTER TABLE "Work" ADD COLUMN "titleJson" JSONB;
UPDATE "Work" SET "titleJson" = jsonb_build_object('en', "title", 'ru', '');
ALTER TABLE "Work" ALTER COLUMN "titleJson" SET NOT NULL;
ALTER TABLE "Work" DROP COLUMN "title";
ALTER TABLE "Work" RENAME COLUMN "titleJson" TO "title";

-- Work.year (Int) -> Work.date (String, "YYYY-MM-DD", same shape as
-- Post.date, but — unlike Post.date — stays admin-editable; see
-- schema.prisma's comment on Work.date for why. Day/month aren't
-- recoverable from the old Int, so existing rows default to "-01-01".
ALTER TABLE "Work" ADD COLUMN "date" TEXT;
UPDATE "Work" SET "date" = "year"::text || '-01-01';
ALTER TABLE "Work" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "Work" DROP COLUMN "year";

-- Work.coverAssetId: exact mirror of Post.coverAssetId (added in the prior
-- migration) — see schema.prisma's comment on Work.coverAssetId for why
-- it's deliberately NOT @unique.
ALTER TABLE "Work" ADD COLUMN "coverAssetId" TEXT;
CREATE INDEX "Work_coverAssetId_idx" ON "Work"("coverAssetId");
ALTER TABLE "Work" ADD CONSTRAINT "Work_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
