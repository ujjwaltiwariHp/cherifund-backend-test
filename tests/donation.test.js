import { prisma } from "../database/db.js";
import request from "supertest";
import app from "../app.js";

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
      findMany: jest.fn(),
      create: jest.fn(),
    },
    campaigns: {
      findUnique: jest.fn(),
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
      expect(res.header["content-type"]).toContain("text/csv");
      expect(res.text).toContain("Donation ID,First Name,Last Name,Email,Phone,Address,Amount,Method,Date");
      expect(res.text).toContain("1,\"Alice\",\"Smith\",\"alice@example.com\",\"1234567890\",\"123 Test St\",1000,online,2026-10-08");
    });
  });

  describe("GET /api/V1/admin/donation (Unified listing)", () => {
    it("should return general donations when type=general", async () => {
      const mockDonations = [
        {
          id: "gen-1",
          firstName: "Bob",
          lastName: "Marley",
          email: "bob@example.com",
          amount: 250,
          status: "paid",
          campaignId: null,
          campaign: null,
        },
      ];

      prisma.donation.count.mockResolvedValue(1);
      prisma.donation.findMany.mockResolvedValue(mockDonations);

      const res = await request(app).get("/api/V1/admin/donation?type=general");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.donations).toEqual(mockDonations);
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ campaignId: null, status: { in: ["paid", "offline"] } }),
        })
      );
    });

    it("should return campaign donations when type=campaign", async () => {
      prisma.donation.count.mockResolvedValue(0);
      prisma.donation.findMany.mockResolvedValue([]);

      const res = await request(app).get("/api/V1/admin/donation?type=campaign&campaignId=camp-999");

      expect(res.status).toBe(200);
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ campaignId: "camp-999" }),
        })
      );
    });
  });

  describe("GET /api/V1/admin/donation/export (Unified export)", () => {
    it("should export donations with Campaign and General types formatted", async () => {
      const mockDonations = [
        {
          id: "d-1",
          campaignId: null,
          campaign: null,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "9876543210",
          address: "City",
          amount: 300,
          paymentMethod: "offline",
          createdAt: new Date("2026-10-12T00:00:00.000Z"),
        },
        {
          id: "d-2",
          campaignId: "camp-1",
          campaign: { id: "camp-1", title: { en: "Clean Water Project" } },
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          phone: "9876543211",
          address: "Town",
          amount: 600,
          paymentMethod: "online",
          createdAt: new Date("2026-10-12T00:00:00.000Z"),
        },
      ];

      prisma.donation.findMany.mockResolvedValue(mockDonations);

      const res = await request(app).get("/api/V1/admin/donation/export");

      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toContain("text/csv");
      expect(res.text).toContain("Donation ID,Type,Campaign ID,Campaign Title,First Name,Last Name,Email,Phone,Address,Amount,Method,Date");
      expect(res.text).toContain("d-1,General,\"\",\"General Donation\"");
      expect(res.text).toContain("d-2,Campaign,\"camp-1\",\"Clean Water Project\"");
    });
  });

  describe("Web Payment createOrder (Dual-Mode)", () => {
    it("should create offline general donation when campaignId is omitted", async () => {
      prisma.donation.create.mockResolvedValue({ id: "don-offline-gen" });

      const res = await request(app)
        .post("/api/V1/web/payment/create-order")
        .send({
          amount: 500,
          paymentMethod: "offline",
          firstName: "General",
          lastName: "Donor",
          email: "gen@example.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.msg).toBe("Offline donation logged successfully");
      expect(prisma.donation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 500,
            campaignId: null,
            paymentMethod: "offline",
          }),
        })
      );
    });

    it("should validate and create offline campaign donation when campaignId is provided", async () => {
      prisma.campaigns.findUnique.mockResolvedValue({ id: "camp-123" });
      prisma.donation.create.mockResolvedValue({ id: "don-offline-camp" });

      const res = await request(app)
        .post("/api/V1/web/payment/create-order")
        .send({
          amount: 750,
          campaignId: "camp-123",
          paymentMethod: "offline",
          firstName: "Campaign",
          lastName: "Donor",
        });

      expect(res.status).toBe(201);
      expect(prisma.campaigns.findUnique).toHaveBeenCalledWith({
        where: { id: "camp-123" },
      });
      expect(prisma.donation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 750,
            campaignId: "camp-123",
            paymentMethod: "offline",
          }),
        })
      );
    });

    it("should return 404 when provided campaignId does not exist", async () => {
      prisma.campaigns.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/V1/web/payment/create-order")
        .send({
          amount: 750,
          campaignId: "non-existent-camp",
          paymentMethod: "offline",
        });

      expect(res.status).toBe(404);
    });
  });
});
