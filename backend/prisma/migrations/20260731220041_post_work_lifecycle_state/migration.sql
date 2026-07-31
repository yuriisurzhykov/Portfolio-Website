-- CreateEnum
CREATE TYPE "LifecycleState" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "lifecycleState" "LifecycleState" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "lifecycleState" "LifecycleState" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- Manual backfill (hand-added — not part of Prisma's own diff): every row
-- that already existed before this migration was, in effect, already
-- "live" — the DEFAULT 'DRAFT' above is correct for rows created AFTER
-- this migration, but would silently hide every pre-existing post/work
-- item from the public site the moment this deploys if left un-backfilled.
-- `publishedAt` is backfilled to `createdAt` as the best available stand-in
-- for "when this was actually published" — the real value was never
-- recorded before this column existed.
UPDATE "Post" SET "lifecycleState" = 'PUBLISHED', "publishedAt" = "createdAt";
UPDATE "Work" SET "lifecycleState" = 'PUBLISHED', "publishedAt" = "createdAt";
