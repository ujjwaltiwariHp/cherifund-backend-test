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

// Mock Email Service
jest.mock("../services/emailService.js", () => ({
  sendInternshipApplicationEmails: jest.fn().mockResolvedValue(true),
  sendApplicationStatusUpdateEmail: jest.fn().mockResolvedValue(true),
  sendDonationReceiptEmail: jest.fn().mockResolvedValue(true),
  sendOfflineDonationPledgeEmail: jest.fn().mockResolvedValue(true),
  sendNewsletterWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

// Mock Notification Service
jest.mock("../services/notificationService.js", () => ({
  createNotification: jest.fn().mockResolvedValue({ id: "notif-1" }),
  getUnreadNotificationCount: jest.fn().mockResolvedValue(0),
}));

// Mock Prisma
jest.mock("../database/db.js", () => ({
  prisma: {
    internshipApplication: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    traineeAlumni: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock Auth
jest.mock("../middlewares/auth.js", () => ({
  authentication: (req, res, next) => {
    req.user = { id: "admin-user-id", role: "ADMIN" };
    next();
  },
}));

jest.mock("../middlewares/isAdmin.js", () => ({
  isAdmin: (req, res, next) => next(),
}));

// Mock Cloudinary
jest.mock("../util/cloudinary.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    public_id: "sample_id",
  }),
  deleteFromCloudinary: jest.fn().mockResolvedValue(true),
}));

// Mock multer resume upload
let mockResumeFile = null;
jest.mock("../middlewares/multerResume.js", () => {
  const uploadResumeLocal = {
    single: () => (req, res, next) => next(),
  };

  const multerResumeUpload = () => (req, res, next) => {
    if (mockResumeFile) {
      req.file = mockResumeFile;
    }
    next();
  };

  return {
    __esModule: true,
    default: uploadResumeLocal,
    multerResumeUpload,
  };
});

// Mock multer image upload
let mockImageFile = null;
jest.mock("../middlewares/multer.js", () => {
  const noop = (req, res, next) => next();

  const uploadLocal = {
    single: jest.fn(() => noop),
    array: jest.fn(() => noop),
    fields: jest.fn(() => noop),
    none: jest.fn(() => noop),
  };

  const multerUpload = () => (req, res, next) => {
    if (mockImageFile) {
      req.file = mockImageFile;
    }
    next();
  };

  return {
    __esModule: true,
    default: uploadLocal,
    multerUpload,
  };
});

describe("Career & Internship Module Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResumeFile = null;
    mockImageFile = null;
  });

  describe("Public Career Endpoints", () => {
    it("GET /api/V1/web/career/domains should return standard list of domains", async () => {
      const res = await request(app).get("/api/V1/web/career/domains");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.domains)).toBe(true);
      expect(res.body.domains.length).toBeGreaterThan(0);
    });

    it("GET /api/V1/web/career/trainees should return active trainees", async () => {
      prisma.traineeAlumni.findMany.mockResolvedValueOnce([
        {
          id: "trainee-1",
          name: { en: "Aman Gupta" },
          university: { en: "IIT Roorkee" },
          domain: { en: "Web Development" },
          batch: "Batch 2025",
          isActive: true,
        },
      ]);

      const res = await request(app).get("/api/V1/web/career/trainees");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.trainees).toHaveLength(1);
    });

    it("POST /api/V1/web/career/apply should reject if full name is missing or too short", async () => {
      const res = await request(app)
        .post("/api/V1/web/career/apply")
        .set("x-bench-key", "yuwa-test-2026")
        .send({ fullName: "A" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Full name is required");
    });

    it("POST /api/V1/web/career/apply should reject if email is invalid", async () => {
      const res = await request(app)
        .post("/api/V1/web/career/apply")
        .set("x-bench-key", "yuwa-test-2026")
        .send({
          fullName: "Rahul Kumar",
          email: "invalid-email-address",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid email address format");
    });

    it("POST /api/V1/web/career/apply should reject if Indian phone number is invalid", async () => {
      const res = await request(app)
        .post("/api/V1/web/career/apply")
        .set("x-bench-key", "yuwa-test-2026")
        .send({
          fullName: "Rahul Kumar",
          email: "rahul@gmail.com",
          phone: "1234567890", // does not start with 6-9
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("valid 10-digit Indian phone number");
    });

    it("POST /api/V1/web/career/apply should reject if resume is missing", async () => {
      const res = await request(app)
        .post("/api/V1/web/career/apply")
        .set("x-bench-key", "yuwa-test-2026")
        .send({
          fullName: "Rahul Kumar",
          email: "rahul@gmail.com",
          phone: "9876543210",
          college: "MMMUT Gorakhpur",
          course: "B.Tech CSE",
          domain: "Web Development (Frontend / Full Stack)",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Resume file is required");
    });

    it("POST /api/V1/web/career/apply should successfully create application when all valid", async () => {
      mockResumeFile = {
        path: "/tmp/sample-resume.pdf",
        filename: "sample-resume.pdf",
        originalname: "sample-resume.pdf",
        mimetype: "application/pdf",
        size: 1024 * 100,
      };

      prisma.internshipApplication.create.mockResolvedValueOnce({
        id: "app-uuid-123",
        applicationNumber: "YUWA-INT-2026-F89A",
        fullName: "Rahul Kumar",
        email: "rahul@gmail.com",
        phone: "9876543210",
        college: "MMMUT Gorakhpur",
        course: "B.Tech CSE",
        domain: "Web Development",
        status: "PENDING",
        createdAt: new Date(),
      });

      const res = await request(app)
        .post("/api/V1/web/career/apply")
        .set("x-bench-key", "yuwa-test-2026")
        .send({
          fullName: "Rahul Kumar",
          email: "rahul@gmail.com",
          phone: "9876543210",
          college: "MMMUT Gorakhpur",
          course: "B.Tech CSE",
          domain: "Web Development",
          tenthPercentage: "88.5",
          twelfthPercentage: "91.2",
          currentCgpa: "8.7",
          city: "Gorakhpur",
          state: "Uttar Pradesh",
          pincode: "273001",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.application.applicationNumber).toBe("YUWA-INT-2026-F89A");
      expect(prisma.internshipApplication.create).toHaveBeenCalled();
    });

    it("POST /api/V1/web/career/apply should reject if CGPA exceeds 10.0", async () => {
      mockResumeFile = {
        path: "/tmp/sample-resume.pdf",
        originalname: "sample-resume.pdf",
        mimetype: "application/pdf",
        size: 1024 * 100,
      };

      const res = await request(app)
        .post("/api/V1/web/career/apply")
        .set("x-bench-key", "yuwa-test-2026")
        .send({
          fullName: "Rahul Kumar",
          email: "rahul@gmail.com",
          phone: "9876543210",
          college: "MMMUT Gorakhpur",
          highestQualification: "Bachelor's Degree",
          domain: "Web Development",
          scoreType: "CGPA",
          score: "11.5",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("CGPA score cannot be greater than 10.0");
    });

    it("POST /api/V1/web/career/apply should reject if percentage exceeds 100%", async () => {
      mockResumeFile = {
        path: "/tmp/sample-resume.pdf",
        originalname: "sample-resume.pdf",
        mimetype: "application/pdf",
        size: 1024 * 100,
      };

      const res = await request(app)
        .post("/api/V1/web/career/apply")
        .set("x-bench-key", "yuwa-test-2026")
        .send({
          fullName: "Rahul Kumar",
          email: "rahul@gmail.com",
          phone: "9876543210",
          college: "MMMUT Gorakhpur",
          highestQualification: "Bachelor's Degree",
          domain: "Web Development",
          scoreType: "PERCENTAGE",
          score: "105",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Percentage score cannot exceed 100%");
    });

    it("POST /api/V1/web/career/apply should reject if score is negative", async () => {
      mockResumeFile = {
        path: "/tmp/sample-resume.pdf",
        originalname: "sample-resume.pdf",
        mimetype: "application/pdf",
        size: 1024 * 100,
      };

      const res = await request(app)
        .post("/api/V1/web/career/apply")
        .set("x-bench-key", "yuwa-test-2026")
        .send({
          fullName: "Rahul Kumar",
          email: "rahul@gmail.com",
          phone: "9876543210",
          college: "MMMUT Gorakhpur",
          highestQualification: "Bachelor's Degree",
          domain: "Web Development",
          scoreType: "CGPA",
          score: "-2",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Marks score must be a non-negative number");
    });
  });

  describe("Admin Career Endpoints", () => {
    it("GET /api/V1/admin/career/applications should return paginated list and counts", async () => {
      prisma.internshipApplication.count.mockResolvedValueOnce(1);
      prisma.internshipApplication.findMany.mockResolvedValueOnce([
        {
          id: "app-1",
          applicationNumber: "YUWA-INT-2026-0001",
          fullName: "Aman Sharma",
          status: "PENDING",
        },
      ]);
      prisma.internshipApplication.groupBy.mockResolvedValueOnce([
        { status: "PENDING", _count: { status: 1 } },
      ]);

      const res = await request(app).get("/api/V1/admin/career/applications");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.applications).toHaveLength(1);
      expect(res.body.counts.PENDING).toBe(1);
    });

    it("PATCH /api/V1/admin/career/applications/:id/status should update application status", async () => {
      prisma.internshipApplication.findUnique.mockResolvedValueOnce({
        id: "app-1",
        applicationNumber: "YUWA-INT-2026-0001",
        status: "PENDING",
      });

      prisma.internshipApplication.update.mockResolvedValueOnce({
        id: "app-1",
        status: "SHORTLISTED",
        adminRemarks: "Excellent resume and portfolio",
      });

      const res = await request(app)
        .patch("/api/V1/admin/career/applications/app-1/status")
        .send({
          status: "SHORTLISTED",
          adminRemarks: "Excellent resume and portfolio",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.status).toBe("SHORTLISTED");
    });

    it("POST /api/V1/admin/career/trainees should create a new trainee with photo", async () => {
      mockImageFile = {
        path: "/tmp/trainee-photo.jpg",
        filename: "trainee-photo.jpg",
      };

      prisma.traineeAlumni.create.mockResolvedValueOnce({
        id: "trainee-new",
        name: { en: "Pooja Verma", hi: "पूजा वर्मा" },
        university: { en: "DU", hi: "दिल्ली विश्वविद्यालय" },
        domain: { en: "UI/UX Design", hi: "UI/UX डिज़ाइन" },
        batch: "Batch 2025",
        isActive: true,
      });

      const res = await request(app)
        .post("/api/V1/admin/career/trainees")
        .send({
          name: JSON.stringify({ en: "Pooja Verma", hi: "पूजा वर्मा" }),
          university: JSON.stringify({ en: "DU", hi: "दिल्ली विश्वविद्यालय" }),
          domain: JSON.stringify({ en: "UI/UX Design", hi: "UI/UX डिज़ाइन" }),
          batch: "Batch 2025",
          displayOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.trainee.id).toBe("trainee-new");
    });

    it("PATCH /api/V1/admin/career/trainees/:id/toggle-status should toggle active state", async () => {
      prisma.traineeAlumni.findUnique.mockResolvedValueOnce({
        id: "trainee-1",
        isActive: true,
      });

      prisma.traineeAlumni.update.mockResolvedValueOnce({
        id: "trainee-1",
        isActive: false,
      });

      const res = await request(app).patch(
        "/api/V1/admin/career/trainees/trainee-1/toggle-status"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.trainee.isActive).toBe(false);
    });
  });
});
