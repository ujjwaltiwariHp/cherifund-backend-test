/*
  Warnings:

  - Changed the type of `title` on the `Blog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `description` on the `Blog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `summary` on the `Blog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `quote` on the `Blog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `quoteAuthor` on the `Blog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tags` on the `Blog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `keyPoints` on the `Blog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `creator` on the `Blog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Blog" DROP COLUMN "title",
ADD COLUMN     "title" JSONB NOT NULL,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB NOT NULL,
DROP COLUMN "summary",
ADD COLUMN     "summary" JSONB NOT NULL,
DROP COLUMN "quote",
ADD COLUMN     "quote" JSONB NOT NULL,
DROP COLUMN "quoteAuthor",
ADD COLUMN     "quoteAuthor" JSONB NOT NULL,
DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB NOT NULL,
DROP COLUMN "keyPoints",
ADD COLUMN     "keyPoints" JSONB NOT NULL,
DROP COLUMN "creator",
ADD COLUMN     "creator" JSONB NOT NULL;
