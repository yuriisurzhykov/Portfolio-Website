-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "text" JSONB,
    "data" JSONB,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "dateLabel" TEXT,
    "title" JSONB NOT NULL,
    "category" JSONB NOT NULL,
    "readMins" INTEGER NOT NULL,
    "excerpt" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "relatedWorkSlug" TEXT,
    "bodyDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "stack" TEXT[],
    "coverImage" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "relatedPostSlug" TEXT,
    "startedLabel" JSONB,
    "shippedLabel" JSONB,
    "role" JSONB,
    "caseStudyDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Block_documentId_idx" ON "Block"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_documentId_order_key" ON "Block"("documentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_bodyDocumentId_key" ON "Post"("bodyDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "Work_slug_key" ON "Work"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Work_caseStudyDocumentId_key" ON "Work"("caseStudyDocumentId");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_bodyDocumentId_fkey" FOREIGN KEY ("bodyDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_caseStudyDocumentId_fkey" FOREIGN KEY ("caseStudyDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
