import { prisma } from "../database/db.js";
import request from "supertest";
import app from "../app.js";

// Mock Swagger
jest.mock("../swagger/swagger.js", () => ({
  swaggerDocument: {},
  swaggerUi: {
    serve: (req, res, next) => next(),
    setup: () => (req, res, next) => next(),
  },
}));

// Mock Prisma
jest.mock("../database/db.js", () => ({
  prisma: {
    galleryImage: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock Auth Middlewares
jest.mock("../middlewares/auth.js", () => ({
  authentication: (req, res, next) => {
    req.user = { id: "admin-id", role: "ADMIN" };
    next();
  },
}));

jest.mock("../middlewares/isAdmin.js", () => ({
  isAdmin: (req, res, next) => next(),
}));

// Mock Cloudinary utilities
jest.mock("../util/cloudinary.js", () => ({
  __esModule: true,
  default: jest.fn(),
  deleteFromCloudinary: jest.fn(),
}));

/**
 * Mock multer.js completely.
 * The middleware file exports:
 *   - default: uploadLocal (the multer instance with .single/.array/.fields)
 *   - multerUpload: a wrapper function
 *
 * Here we simulate a file upload by attaching req.file inside multerUpload,
 * and provide no-op stubs for all multer instance methods used across routes.
 */
jest.mock("../middlewares/multer.js", () => {
  const noop = (req, res, next) => next();

  // Simulate successful upload — attaches req.file
  const multerUpload = () => (req, res, next) => {
    req.file = {
      path: "/tmp/mock-image.jpg",
      originalname: "mock-image.jpg",
      mimetype: "image/jpeg",
    };
    next();
  };

  // uploadLocal mock — must have .single(), .array(), .fields(), .none()
  // because routes like blog.js call uploadLocal.array() at module load time
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

import uploadToCloudinary, { deleteFromCloudinary } from "../util/cloudinary.js";
// Use requireMock to get the mocked default export as a jest.fn()
const cloudinaryMock = jest.requireMock("../util/cloudinary.js");

describe("Gallery Admin & Web APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // ADMIN: POST /add-image
  // ─────────────────────────────────────────────
  describe("POST /api/V1/admin/gallery/add-image", () => {
    it("should upload image and create gallery record", async () => {
      // Set up cloudinary mock to return a successful result
      const cloudinaryModule = jest.requireMock("../util/cloudinary.js");
      cloudinaryModule.default.mockResolvedValue({
        secure_url: "https://res.cloudinary.com/test/image/upload/Gallery/mock.jpg",
        public_id: "Gallery/mock",
      });

      const mockRecord = {
        id: "gallery-uuid-1",
        imageUrl: {
          url: "https://res.cloudinary.com/test/image/upload/Gallery/mock.jpg",
          public_id: "Gallery/mock",
        },
        altText: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.galleryImage.create.mockResolvedValue(mockRecord);

      // multerUpload mock injects req.file automatically (see mock above)
      // altText is optional — send as JSON body (multerUpload mock passes through)
      const res = await request(app)
        .post("/api/V1/admin/gallery/add-image")
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.msg).toBe("Gallery image added successfully");
      expect(res.body.galleryImage).toMatchObject({ id: "gallery-uuid-1" });
      expect(prisma.galleryImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageUrl: expect.objectContaining({
              url: "https://res.cloudinary.com/test/image/upload/Gallery/mock.jpg",
              public_id: "Gallery/mock",
            }),
          }),
        })
      );
    });
  });

  // ─────────────────────────────────────────────
  // ADMIN: GET /getAllImages
  // ─────────────────────────────────────────────
  describe("GET /api/V1/admin/gallery/getAllImages", () => {
    it("should return paginated gallery images with correct shape", async () => {
      const mockImages = [
        {
          id: "g-1",
          imageUrl: { url: "https://cdn.test/img1.jpg", public_id: "Gallery/img1" },
          altText: "Image 1",
          createdAt: new Date(),
        },
        {
          id: "g-2",
          imageUrl: { url: "https://cdn.test/img2.jpg", public_id: "Gallery/img2" },
          altText: null,
          createdAt: new Date(),
        },
      ];

      prisma.galleryImage.count.mockResolvedValue(2);
      prisma.galleryImage.findMany.mockResolvedValue(mockImages);

      const res = await request(app).get("/api/V1/admin/gallery/getAllImages?page=1&limit=10");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.images).toHaveLength(2);
      expect(res.body.images[0].imageUrl).toBe("https://cdn.test/img1.jpg");
      expect(res.body.images[0].public_id).toBe("Gallery/img1");
      expect(res.body.totalPages).toBe(1);
      expect(prisma.galleryImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should return empty array when no images exist", async () => {
      prisma.galleryImage.count.mockResolvedValue(0);
      prisma.galleryImage.findMany.mockResolvedValue([]);

      const res = await request(app).get("/api/V1/admin/gallery/getAllImages");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.images).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────
  // ADMIN: DELETE /delete/:id
  // ─────────────────────────────────────────────
  describe("DELETE /api/V1/admin/gallery/delete/:id", () => {
    it("should return 404 when gallery image not found", async () => {
      prisma.galleryImage.findUnique.mockResolvedValue(null);

      const res = await request(app).delete("/api/V1/admin/gallery/delete/non-existent-id");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Gallery image not found");
      expect(prisma.galleryImage.delete).not.toHaveBeenCalled();
    });

    it("should delete from Cloudinary and DB when image exists", async () => {
      const mockImage = {
        id: "g-1",
        imageUrl: { url: "https://cdn.test/img1.jpg", public_id: "Gallery/img1" },
        altText: "Image 1",
      };

      prisma.galleryImage.findUnique.mockResolvedValue(mockImage);
      deleteFromCloudinary.mockResolvedValue(undefined);
      prisma.galleryImage.delete.mockResolvedValue(mockImage);

      const res = await request(app).delete("/api/V1/admin/gallery/delete/g-1");

      expect(res.status).toBe(200);
      expect(res.body.msg).toBe("Gallery image deleted successfully");
      expect(deleteFromCloudinary).toHaveBeenCalledWith("Gallery/img1", expect.any(Function));
      expect(prisma.galleryImage.delete).toHaveBeenCalledWith({ where: { id: "g-1" } });
    });
  });

  // ─────────────────────────────────────────────
  // WEB (PUBLIC): GET /getAllImages
  // ─────────────────────────────────────────────
  describe("GET /api/V1/web/gallery/getAllImages (public — no auth)", () => {
    it("should return all gallery images without authentication", async () => {
      const mockImages = [
        {
          id: "g-1",
          imageUrl: { url: "https://cdn.test/img1.jpg", public_id: "Gallery/img1" },
          altText: "Image 1",
          createdAt: new Date(),
        },
        {
          id: "g-2",
          imageUrl: { url: "https://cdn.test/img2.jpg", public_id: "Gallery/img2" },
          altText: null,
          createdAt: new Date(),
        },
      ];

      prisma.galleryImage.count.mockResolvedValue(2);
      prisma.galleryImage.findMany.mockResolvedValue(mockImages);

      const res = await request(app).get("/api/V1/web/gallery/getAllImages");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.images).toHaveLength(2);
      // Public endpoint must NOT expose public_id
      expect(res.body.images[0]).not.toHaveProperty("public_id");
      expect(res.body.images[0].imageUrl).toBe("https://cdn.test/img1.jpg");
    });

    it("should apply default limit of 100 for public endpoint", async () => {
      prisma.galleryImage.count.mockResolvedValue(0);
      prisma.galleryImage.findMany.mockResolvedValue([]);

      await request(app).get("/api/V1/web/gallery/getAllImages");

      expect(prisma.galleryImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });
});
