/*
  Warnings:

  - You are about to drop the column `likeCCount` on the `comment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."comment" DROP COLUMN "likeCCount",
ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0;
