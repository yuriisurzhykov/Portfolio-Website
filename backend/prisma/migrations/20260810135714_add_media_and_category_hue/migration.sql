-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "coverAssetId" TEXT;

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "placeholder" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "generation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryHue" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hue" DOUBLE PRECISION NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryHue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_contentHash_key" ON "MediaAsset"("contentHash");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_idx" ON "MediaAsset"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryHue_category_key" ON "CategoryHue"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryHue_ordinal_key" ON "CategoryHue"("ordinal");

-- CreateIndex
CREATE INDEX "Post_coverAssetId_idx" ON "Post"("coverAssetId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;


