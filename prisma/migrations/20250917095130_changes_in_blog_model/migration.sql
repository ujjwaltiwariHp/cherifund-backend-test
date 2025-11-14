/*
  Warnings:

  - Made the column `creator` on table `Blog` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Blog" ALTER COLUMN "creator" SET NOT NULL;
