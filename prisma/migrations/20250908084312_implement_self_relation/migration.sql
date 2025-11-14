-- AddForeignKey
ALTER TABLE "public"."comment" ADD CONSTRAINT "comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
