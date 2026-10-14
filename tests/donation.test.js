import { prisma } from "../database/db.js";
import request from "supertest";
import app from "../app.js";

// Mock Swagger
jest.mock("../swagger/swagger.js", () => ({
  swaggerDocument: {},
  swaggerUi: { serve: (req, res, next) => next(), setup: () => (req, res, next) => next() },
}));

// Mocking Prisma
jest.mock("../database/db.js", () => {
  const mockClient = {
    $transaction: jest.fn(async (callback) => callback(mockClient)),
    donation: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    campaigns: {
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    event: {
      count: jest.fn(),
    },
    member: {
      count: jest.fn(),
    },
    comment: {
      count: jest.fn(),
    },
    feedback: {
      count: jest.fn(),
    },
  };
  return { prisma: mockClient };
});

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
    prisma.donation.aggregate.mockResolvedValue({
      _sum: { amount: 1000 },
      _count: { id: 5 },
    });
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

  describe("GET /api/V1/admin/donation (Unified listing & metrics)", () => {
    it("should return general donations when type=general with summary metrics", async () => {
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
      prisma.donation.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 250 } }) // filteredSum
        .mockResolvedValueOnce({ _sum: { amount: 1000 }, _count: { id: 4 } }) // totalSum
        .mockResolvedValueOnce({ _sum: { amount: 750 }, _count: { id: 3 } }) // onlineSum
        .mockResolvedValueOnce({ _sum: { amount: 250 }, _count: { id: 1 } }) // offlineSum
        .mockResolvedValueOnce({ _sum: { amount: 250 }, _count: { id: 1 } }) // generalSum
        .mockResolvedValueOnce({ _sum: { amount: 750 }, _count: { id: 3 } }); // campaignSum

      const res = await request(app).get("/api/V1/admin/donation?type=general");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.donations).toEqual(mockDonations);
      expect(res.body.summary).toEqual({
        totalAmount: 1000,
        totalCount: 4,
        onlineAmount: 750,
        onlineCount: 3,
        offlineAmount: 250,
        offlineCount: 1,
        generalAmount: 250,
        generalCount: 1,
        campaignAmount: 750,
        campaignCount: 3,
      });
      expect(res.body.filteredSummary).toEqual({
        totalAmount: 250,
        totalCount: 1,
      });
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ campaignId: null, status: { in: ["paid", "offline"] } }),
        })
      );
    });

    it("should filter by paymentMethod=offline and campaignId", async () => {
      prisma.donation.count.mockResolvedValue(0);
      prisma.donation.findMany.mockResolvedValue([]);

      const res = await request(app).get("/api/V1/admin/donation?type=campaign&campaignId=camp-999&paymentMethod=offline");

      expect(res.status).toBe(200);
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: "camp-999",
            paymentMethod: "offline",
          }),
        })
      );
    });

    it("should filter by search and date range", async () => {
      prisma.donation.count.mockResolvedValue(0);
      prisma.donation.findMany.mockResolvedValue([]);

      const res = await request(app).get("/api/V1/admin/donation?search=Alice&startDate=2026-10-01&endDate=2026-10-12");

      expect(res.status).toBe(200);
      expect(prisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: "Alice", mode: "insensitive" } },
            ]),
            createdAt: expect.objectContaining({
              gte: new Date("2026-10-01"),
            }),
          }),
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
          status: "offline",
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
          status: "paid",
          createdAt: new Date("2026-10-12T00:00:00.000Z"),
        },
      ];

      prisma.donation.findMany.mockResolvedValue(mockDonations);

      const res = await request(app).get("/api/V1/admin/donation/export");

      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toContain("text/csv");
      expect(res.text).toContain("Donation ID,Type,Campaign ID,Campaign Title,First Name,Last Name,Email,Phone,Address,Amount,Method,Status,Date");
      expect(res.text).toContain("d-1,General,\"\",\"General Donation\"");
      expect(res.text).toContain("d-2,Campaign,\"camp-1\",\"Clean Water Project\"");
    });
  });

  describe("GET /api/V1/admin/dashboard/get-data (Accurate funds aggregation)", () => {
    it("should return accurate total funds and fund breakdowns from verified donations", async () => {
      prisma.campaigns.count.mockResolvedValue(4);
      prisma.event.count.mockResolvedValue(2);
      prisma.member.count.mockResolvedValue(10);
      prisma.comment.count.mockResolvedValue(2);
      prisma.feedback.count.mockResolvedValue(1);

      prisma.donation.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 19150 }, _count: { id: 18 } }) // totalDonations
        .mockResolvedValueOnce({ _sum: { amount: 1000 }, _count: { id: 2 } })   // generalDonations
        .mockResolvedValueOnce({ _sum: { amount: 18150 }, _count: { id: 16 } }) // campaignDonations
        .mockResolvedValueOnce({ _sum: { amount: 18650 }, _count: { id: 17 } }) // onlineDonations
        .mockResolvedValueOnce({ _sum: { amount: 500 }, _count: { id: 1 } });   // offlineDonations

      const res = await request(app).get("/api/V1/admin/dashboard/get-data");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        activeCampaign: 4,
        liveEvents: 2,
        totalMembers: 10,
        totalFunds: 19150,
        generalFunds: 1000,
        campaignFunds: 18150,
        onlineFunds: 18650,
        offlineFunds: 500,
        totalDonationsCount: 18,
        generalDonationsCount: 2,
        campaignDonationsCount: 16,
        pendingRequest: 3,
      });
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
      prisma.campaigns.update.mockResolvedValue({ id: "camp-123", raisedAmount: 750, goalAmount: 1000 });
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
      expect(prisma.campaigns.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "camp-123" },
          data: {
            raisedAmount: {
              increment: 750,
            },
          },
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

  describe("Razorpay Webhook (Idempotent Campaign Raised Amount)", () => {
    it("should increment campaign raisedAmount on first payment event", async () => {
      prisma.donation.findUnique.mockResolvedValue({ id: "don-1", status: "created", orderId: "order_123" });
      prisma.donation.update.mockResolvedValue({ id: "don-1", status: "paid" });
      prisma.campaigns.update.mockResolvedValue({ id: "camp-123", raisedAmount: 500, goalAmount: 1000 });

      const res = await request(app)
        .post("/api/V1/payment/razorpay-webhook")
        .set("x-razorpay-signature", "dummy-sig")
        .send({
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: "pay_123",
                order_id: "order_123",
                amount: 50000,
                notes: {
                  campaignId: "camp-123",
                },
              },
            },
          },
        });

      expect(res.status).toBe(200);
      expect(prisma.campaigns.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "camp-123" },
          data: {
            raisedAmount: {
              increment: 500,
            },
          },
        })
      );
    });

    it("should NOT increment campaign raisedAmount if donation was already marked paid", async () => {
      prisma.donation.findUnique.mockResolvedValue({ id: "don-1", status: "paid", orderId: "order_123" });
      prisma.donation.update.mockResolvedValue({ id: "don-1", status: "paid" });

      const res = await request(app)
        .post("/api/V1/payment/razorpay-webhook")
        .set("x-razorpay-signature", "dummy-sig")
        .send({
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: "pay_123",
                order_id: "order_123",
                amount: 50000,
                notes: {
                  campaignId: "camp-123",
                },
              },
            },
          },
        });

      expect(res.status).toBe(200);
      expect(prisma.campaigns.update).not.toHaveBeenCalled();
    });
  });
});
