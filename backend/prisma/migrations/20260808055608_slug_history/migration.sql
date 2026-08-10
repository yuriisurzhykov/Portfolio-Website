-- CreateTable
CREATE TABLE "SlugHistory" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "formerSlug" TEXT NOT NULL,
    "currentSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlugHistory_kind_currentSlug_idx" ON "SlugHistory"("kind", "currentSlug");

-- CreateIndex
CREATE UNIQUE INDEX "SlugHistory_kind_formerSlug_key" ON "SlugHistory"("kind", "formerSlug");
