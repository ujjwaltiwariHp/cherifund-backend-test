-- CreateTable
CREATE TABLE "public"."blacklisted" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '24 hours',

    CONSTRAINT "blacklisted_pkey" PRIMARY KEY ("id")
);
