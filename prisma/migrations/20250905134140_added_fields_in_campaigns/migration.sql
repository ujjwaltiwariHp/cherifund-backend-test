/*
  Warnings:

  - Made the column `summary` on table `Campaigns` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Campaigns" ALTER COLUMN "summary" SET NOT NULL;
