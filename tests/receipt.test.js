import request from "supertest";
import { prisma } from "../database/db.js";

// Mock Swagger
jest.mock("../swagger/swagger.js", () => ({
  swaggerDocument: {},
  swaggerUi: { serve: (req, res, next) => next(), setup: () => (req, res, next) => next() },
}));

// Mocking Prisma
jest.mock("../database/db.js", () => ({
  prisma: {
    donation: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    campaigns: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      donation: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      campaigns: {
        findUnique: jest.fn(),
        update: jest.fn(),
      }
    })),
  },
}));

import app from "../app.js";
import { numberToWordsINR, generateReceiptNumber } from "../util/receiptHelper.js";

describe("Receipt Helper and Certificate APIs", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("numberToWordsINR utility", () => {
        test("converts standard amounts accurately", () => {
            expect(numberToWordsINR(5000)).toBe("Five Thousand Rupees Only");
            expect(numberToWordsINR(302)).toBe("Three Hundred Two Rupees Only");
            expect(numberToWordsINR(100500)).toBe("One Lakh Five Hundred Rupees Only");
            expect(numberToWordsINR(5000000)).toBe("Fifty Lakh Rupees Only");
            expect(numberToWordsINR(0)).toBe("Zero Rupees Only");
        });
    });

    describe("generateReceiptNumber utility", () => {
        test("generates receipt number in format YUWA-YEAR-0001-UUID", async () => {
            prisma.donation.count.mockResolvedValue(0);
            const receiptNo = await generateReceiptNumber(prisma);
            const currentYear = new Date().getFullYear();
            const regex = new RegExp(`^YUWA-${currentYear}-0001-[a-f0-9]{8}$`);
            expect(receiptNo).toMatch(regex);
        });

        test("increments count properly", async () => {
            prisma.donation.count.mockResolvedValue(42);
            const receiptNo = await generateReceiptNumber(prisma);
            const currentYear = new Date().getFullYear();
            const regex = new RegExp(`^YUWA-${currentYear}-0043-[a-f0-9]{8}$`);
            expect(receiptNo).toMatch(regex);
        });
    });

    describe("GET /api/V1/web/payment/receipt/:identifier", () => {
        const mockDonation = {
            id: "don-123",
            orderId: "order_12345",
            razorpayId: "pay_12345",
            receiptNumber: "YUWA-2026-0001-abc12345",
            amount: 2500,
            status: "paid",
            paymentMethod: "online",
            firstName: "Aman",
            lastName: "Verma",
            email: "aman@example.com",
            phone: "9876543210",
            address: "Civil Lines, Gorakhpur",
            createdAt: new Date("2026-10-14T10:00:00.000Z"),
            campaign: {
                id: "camp-1",
                title: { en: "Child Education Care" }
            }
        };

        test("should retrieve certificate receipt by receiptNumber", async () => {
            prisma.donation.findFirst.mockResolvedValue(mockDonation);

            const res = await request(app)
                .get(`/api/V1/web/payment/receipt/${mockDonation.receiptNumber}`);

            expect(res.status).toBe(200);
            expect(res.body.receipt).toBeDefined();
            expect(res.body.receipt.receiptNumber).toBe(mockDonation.receiptNumber);
            expect(res.body.receipt.amount).toBe(2500);
            expect(res.body.receipt.amountInWords).toBe("Two Thousand Five Hundred Rupees Only");
            expect(res.body.receipt.donorName).toBe("Aman Verma");
            expect(res.body.receipt.campaignTitle).toBe("Child Education Care");
            expect(res.body.receipt.organization.name).toBe("YOUTH UTIL WELFARE ASSOCIATION");
            expect(res.body.receipt.organization.registrationNo).toBe("SOCIETY/WEST/ 2016/8902080");
        });

        test("should retrieve certificate receipt by orderId", async () => {
            prisma.donation.findFirst.mockResolvedValue(mockDonation);

            const res = await request(app)
                .get(`/api/V1/web/payment/receipt/${mockDonation.orderId}`);

            expect(res.status).toBe(200);
            expect(res.body.receipt.receiptNumber).toBe(mockDonation.receiptNumber);
        });

        test("should return 404 for unknown receipt identifier", async () => {
            prisma.donation.findFirst.mockResolvedValue(null);

            const res = await request(app)
                .get("/api/V1/web/payment/receipt/unknown-id");

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/not found/i);
        });
    });
});
