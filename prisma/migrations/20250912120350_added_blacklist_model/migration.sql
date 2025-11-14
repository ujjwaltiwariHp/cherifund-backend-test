-- AlterTable
ALTER TABLE "public"."Blacklisted" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '24 hours';
