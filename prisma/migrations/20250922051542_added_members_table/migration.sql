-- CreateTable
CREATE TABLE "public"."Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "about" TEXT,
    "title" TEXT,
    "keyPoints" TEXT[],
    "imageUrl" TEXT NOT NULL,
    "facebookUrl" TEXT,
    "twitterUrl" TEXT,
    "instagramUrl" TEXT,
    "linkedInUrl" TEXT,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);
