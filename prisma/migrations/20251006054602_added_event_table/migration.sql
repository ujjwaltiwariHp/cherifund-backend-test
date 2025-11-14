-- CreateTable
CREATE TABLE "public"."Donation" (
    "id" TEXT NOT NULL,
    "razorpayId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "imageUrl" JSONB NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_razorpayId_key" ON "public"."Donation"("razorpayId");

-- AddForeignKey
ALTER TABLE "public"."Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
