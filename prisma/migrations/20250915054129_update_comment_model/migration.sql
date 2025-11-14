-- AlterTable
ALTER TABLE "public"."comment" ADD COLUMN     "blogId" TEXT,
ALTER COLUMN "campaignId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."comment" ADD CONSTRAINT "comment_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "public"."Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
