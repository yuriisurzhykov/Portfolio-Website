-- Smart-link previews (see backend/src/link-preview/README.md). Additive
-- only: one new table, no existing column touched.
-- CreateTable
CREATE TABLE "LinkPreview" (
    "id" TEXT NOT NULL,
    "urlKey" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "finalUrl" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "siteName" TEXT,
    "imageAssetId" TEXT,
    "faviconAssetId" TEXT,
    "status" TEXT NOT NULL,
    "lastError" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkPreview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkPreview_urlKey_locale_key" ON "LinkPreview"("urlKey", "locale");

-- AddForeignKey
ALTER TABLE "LinkPreview" ADD CONSTRAINT "LinkPreview_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkPreview" ADD CONSTRAINT "LinkPreview_faviconAssetId_fkey" FOREIGN KEY ("faviconAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
