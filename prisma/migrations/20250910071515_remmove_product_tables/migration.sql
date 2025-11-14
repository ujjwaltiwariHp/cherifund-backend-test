/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductImage" DROP CONSTRAINT "ProductImage_variantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductTag" DROP CONSTRAINT "ProductTag_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductTag" DROP CONSTRAINT "ProductTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- DropTable
DROP TABLE "public"."Product";

-- DropTable
DROP TABLE "public"."ProductCategory";

-- DropTable
DROP TABLE "public"."ProductImage";

-- DropTable
DROP TABLE "public"."ProductTag";

-- DropTable
DROP TABLE "public"."ProductVariant";

-- DropTable
DROP TABLE "public"."Tag";
