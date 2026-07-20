-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "bodyDocumentIdRu" TEXT;

-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "caseStudyDocumentIdRu" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_bodyDocumentIdRu_key" ON "Post"("bodyDocumentIdRu");

-- CreateIndex
CREATE UNIQUE INDEX "Work_caseStudyDocumentIdRu_key" ON "Work"("caseStudyDocumentIdRu");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_bodyDocumentIdRu_fkey" FOREIGN KEY ("bodyDocumentIdRu") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_caseStudyDocumentIdRu_fkey" FOREIGN KEY ("caseStudyDocumentIdRu") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
