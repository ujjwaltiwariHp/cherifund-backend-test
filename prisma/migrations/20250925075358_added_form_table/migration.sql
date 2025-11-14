-- CreateTable
CREATE TABLE "public"."Form" (
    "id" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "firstName" TEXT,
    "lastname" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "occupation" TEXT,
    "message" TEXT NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);
