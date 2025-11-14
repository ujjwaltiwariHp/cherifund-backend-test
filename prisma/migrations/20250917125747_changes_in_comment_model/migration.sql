-- CreateEnum
CREATE TYPE "public"."commentStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- AlterTable
ALTER TABLE "public"."comment" ADD COLUMN     "status" "public"."commentStatus" NOT NULL DEFAULT 'Pending';
