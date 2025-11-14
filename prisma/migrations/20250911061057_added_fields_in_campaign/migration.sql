/*
  Warnings:

  - You are about to drop the column `category` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Campaigns` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `Campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Blog" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Campaigns" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "public"."Category";

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- AddForeignKey
ALTER TABLE "public"."Campaigns" ADD CONSTRAINT "Campaigns_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Blog" ADD CONSTRAINT "Blog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
