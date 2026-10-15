import { prisma } from "../database/db.js";
import request from "supertest";

// Mock Swagger
jest.mock("../swagger/swagger.js", () => ({
  swaggerDocument: {},
  swaggerUi: { serve: (req, res, next) => next(), setup: () => (req, res, next) => next() },
}));

// Mock Cloudinary
jest.mock("../util/cloudinary.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ secure_url: "https://example.com/new.jpg", public_id: "new_id" }),
  deleteFromCloudinary: jest.fn().mockResolvedValue({}),
}));

// Mock Multer upload
jest.mock("../middlewares/multer.js", () => {
  const noop = (req, res, next) => next();
  const multerUpload = () => (req, res, next) => {
    req.files = [];
    next();
  };
  const uploadLocal = {
    single: jest.fn(() => noop),
    array: jest.fn(() => noop),
    fields: jest.fn(() => noop),
    none: jest.fn(() => noop),
  };
  return {
    __esModule: true,
    default: uploadLocal,
    multerUpload,
  };
});

// Mocking Prisma
jest.mock("../database/db.js", () => {
  const mockClient = {
    $transaction: jest.fn(async (callback) => callback(mockClient)),
    campaigns: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    donation: {
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
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

import app from "../app.js";

describe("Campaign Admin updateCampaign status transition on goal change", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should switch status from Completed to Active when goalAmount is increased above raisedAmount", async () => {
    prisma.campaigns.findUnique.mockResolvedValue({
      id: "camp-1",
      title: { en: "Education", hi: "शिक्षा" },
      categoryId: "cat-1",
      description: { en: "Desc", hi: "विवरण" },
      summary: { en: "Summary", hi: "सारांश" },
      keyPoints: ["Point 1"],
      imageUrl: { images: [{ url: "https://example.com/img1.jpg", public_id: "img1" }] },
      goalAmount: 50000,
      raisedAmount: 50000,
      status: "Completed",
      location: { en: "Delhi", hi: "दिल्ली" },
    });

    prisma.campaigns.update.mockResolvedValue({
      id: "camp-1",
      goalAmount: 100000,
      status: "Active",
    });

    const res = await request(app)
      .put("/api/V1/admin/campaign/update-campaign/camp-1")
      .send({
        goalAmount: 100000,
        existingImages: ["https://example.com/img1.jpg"],
      });

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Campaign updated successfully");

    expect(prisma.campaigns.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "camp-1" },
        data: expect.objectContaining({
          goalAmount: 100000,
          status: "Active",
        }),
      })
    );
  });

  it("should switch status from Active to Completed when goalAmount is reduced below or equal to raisedAmount", async () => {
    prisma.campaigns.findUnique.mockResolvedValue({
      id: "camp-2",
      title: { en: "Health", hi: "स्वास्थ्य" },
      categoryId: "cat-1",
      description: { en: "Desc", hi: "विवरण" },
      summary: { en: "Summary", hi: "सारांश" },
      keyPoints: ["Point 1"],
      imageUrl: { images: [] },
      goalAmount: 100000,
      raisedAmount: 60000,
      status: "Active",
      location: { en: "Mumbai", hi: "मुंबई" },
    });

    prisma.campaigns.update.mockResolvedValue({
      id: "camp-2",
      goalAmount: 50000,
      status: "Completed",
    });

    const res = await request(app)
      .put("/api/V1/admin/campaign/update-campaign/camp-2")
      .send({
        goalAmount: 50000,
      });

    expect(res.status).toBe(200);
    expect(prisma.campaigns.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "camp-2" },
        data: expect.objectContaining({
          goalAmount: 50000,
          status: "Completed",
        }),
      })
    );
  });

  it("should keep status Inactive if the campaign was previously Inactive", async () => {
    prisma.campaigns.findUnique.mockResolvedValue({
      id: "camp-3",
      title: { en: "Disabled", hi: "अक्षम" },
      categoryId: "cat-1",
      description: { en: "Desc", hi: "विवरण" },
      summary: { en: "Summary", hi: "सारांश" },
      keyPoints: [],
      imageUrl: { images: [] },
      goalAmount: 50000,
      raisedAmount: 10000,
      status: "Inactive",
      location: { en: "Goa", hi: "गोवा" },
    });

    prisma.campaigns.update.mockResolvedValue({
      id: "camp-3",
      goalAmount: 80000,
      status: "Inactive",
    });

    const res = await request(app)
      .put("/api/V1/admin/campaign/update-campaign/camp-3")
      .send({
        goalAmount: 80000,
      });

    expect(res.status).toBe(200);
    expect(prisma.campaigns.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "camp-3" },
        data: expect.objectContaining({
          goalAmount: 80000,
          status: "Inactive",
        }),
      })
    );
  });
});
