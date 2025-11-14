/*
  Warnings:

  - The values [Pending,Approved,Rejected] on the enum `commentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `approved` on the `comment` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."commentStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "public"."comment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."comment" ALTER COLUMN "status" TYPE "public"."commentStatus_new" USING ("status"::text::"public"."commentStatus_new");
ALTER TYPE "public"."commentStatus" RENAME TO "commentStatus_old";
ALTER TYPE "public"."commentStatus_new" RENAME TO "commentStatus";
DROP TYPE "public"."commentStatus_old";
ALTER TABLE "public"."comment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "public"."comment" DROP COLUMN "approved",
ALTER COLUMN "status" SET DEFAULT 'PENDING';
