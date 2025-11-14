/*
  Warnings:

  - The `title` column on the `Member` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `name` on the `Member` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `position` on the `Member` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `description` on the `Member` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `about` to the `Member` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `keyPoints` on the `Member` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Member" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL,
DROP COLUMN "position",
ADD COLUMN     "position" JSONB NOT NULL,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB NOT NULL,
DROP COLUMN "about",
ADD COLUMN     "about" JSONB NOT NULL,
DROP COLUMN "title",
ADD COLUMN     "title" JSONB,
DROP COLUMN "keyPoints",
ADD COLUMN     "keyPoints" JSONB NOT NULL;
