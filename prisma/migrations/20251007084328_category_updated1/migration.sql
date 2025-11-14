/*
  Warnings:

  - Changed the type of `name` on the `Category` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Category" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");
