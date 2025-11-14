/*
  Warnings:

  - You are about to drop the column `lastname` on the `Form` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Form" DROP COLUMN "lastname",
ADD COLUMN     "lastName" TEXT;
