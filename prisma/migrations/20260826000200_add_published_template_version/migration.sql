-- AlterTable
ALTER TABLE "public"."Template" ADD COLUMN "publishedVersionId" TEXT;

-- BackfillPublishedVersion
UPDATE "public"."Template" AS template
SET "publishedVersionId" = (
    SELECT version."id"
    FROM "public"."TemplateVersion" AS version
    WHERE version."templateId" = template."id"
    ORDER BY version."version" DESC
    LIMIT 1
)
WHERE template."status" = 'PUBLISHED';

-- CreateIndex
CREATE UNIQUE INDEX "Template_publishedVersionId_key" ON "public"."Template"("publishedVersionId");

-- AddForeignKey
ALTER TABLE "public"."Template" ADD CONSTRAINT "Template_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "public"."TemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
