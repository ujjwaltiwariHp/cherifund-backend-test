-- DropForeignKey
ALTER TABLE "public"."comment" DROP CONSTRAINT "comment_campaignId_fkey";

-- AddForeignKey
ALTER TABLE "public"."comment" ADD CONSTRAINT "comment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
