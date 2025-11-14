-- CreateTable
CREATE TABLE "public"."Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "imageUrl" JSONB NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Banner_priority_key" ON "public"."Banner"("priority");
