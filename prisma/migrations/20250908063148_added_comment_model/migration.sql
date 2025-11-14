-- CreateTable
CREATE TABLE "public"."comment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."comment" ADD CONSTRAINT "comment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
