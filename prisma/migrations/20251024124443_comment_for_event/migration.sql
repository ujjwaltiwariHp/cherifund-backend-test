-- AlterTable
ALTER TABLE "public"."comment" ADD COLUMN     "eventId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."comment" ADD CONSTRAINT "comment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
