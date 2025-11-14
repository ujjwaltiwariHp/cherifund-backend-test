-- CreateTable
CREATE TABLE "public"."Feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "imageUrl" JSONB,
    "feedback" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "status" "public"."commentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
