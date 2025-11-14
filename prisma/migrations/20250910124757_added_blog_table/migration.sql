-- CreateTable
CREATE TABLE "public"."Blog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "quoteAuthor" TEXT NOT NULL,
    "category" "public"."Category" NOT NULL,
    "tags" TEXT[],
    "keyPoints" TEXT[],
    "location" TEXT NOT NULL,
    "imageUrl" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);
