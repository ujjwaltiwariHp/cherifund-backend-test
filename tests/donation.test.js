import { prisma } from "../database/db.js";
import request from "supertest";
import app from "../app.js";

// Mocking Prisma
jest.mock("../database/db.js", () => ({
  prisma: {
    donation: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mocking Authentication Middlewares
jest.mock("../middlewares/auth.js", () => ({
  authentication: (req, res, next) => {
    req.user = { id: "admin-id", role: "ADMIN" };
    next();
  },
}));

jest.mock("../middlewares/isAdmin.js", () => ({
  isAdmin: (req, res, next) => next(),
}));

describe("Donation Admin APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/V1/admin/donation/campaign/:campaignId", () => {
    it("should return paginated donors for a campaign", async () => {
      const mockDonors = [
        {
          id: "1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          amount: 500,
          status: "paid",
        },
      ];

      prisma.donation.count.mockResolvedValue(1);
      prisma.donation.findMany.mockResolvedValue(mockDonors);

      const res = await request(app).get("/api/V1/admin/donation/campaign/camp-123");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.donors).toEqual(mockDonors);
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId: "camp-123", status: { in: ["paid", "offline"] } },
        })
      );
    });
  });

  describe("GET /api/V1/admin/donation/campaign/:campaignId/export", () => {
    it("should return CSV data of donors", async () => {
      const mockDonors = [
        {
          id: "1",
          firstName: "Alice",
          lastName: "Smith",
          email: "alice@example.com",
          phone: "1234567890",
          address: "123 Test St",
          amount: 1000,
          paymentMethod: "online",
          createdAt: new Date("2026-10-08T00:00:00.000Z"),
          campaignId: "camp-123"
        },
      ];

      prisma.donation.findMany.mockResolvedValue(mockDonors);

      const res = await request(app).get("/api/V1/admin/donation/campaign/camp-123/export");

      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toBe("text/csv");
      expect(res.text).toContain("Donation ID,First Name,Last Name,Email,Phone,Address,Amount,Method,Date");
      expect(res.text).toContain("1,\"Alice\",\"Smith\",\"alice@example.com\",\"1234567890\",\"123 Test St\",1000,online,2026-10-08");
    });
  });
});
