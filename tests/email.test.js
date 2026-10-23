import { prisma } from "../database/db.js"
import request from "supertest"

// Mock Swagger
jest.mock("../swagger/swagger.js", () => ({
  swaggerDocument: {},
  swaggerUi: { serve: (req, res, next) => next(), setup: () => (req, res, next) => next() },
}))

// Mock mailSender
jest.mock("../util/mailSender.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ success: true, messageId: "mock-msg-123" }),
}))

// Mock Prisma
jest.mock("../database/db.js", () => {
  const mockClient = {
    $transaction: jest.fn(async (callback) => callback(mockClient)),
    donation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    campaigns: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    emailSubscriber: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    form: {
      create: jest.fn(),
    },
  }
  return { prisma: mockClient }
})

// Mock Auth
jest.mock("../middlewares/auth.js", () => ({
  authentication: (req, res, next) => {
    req.user = { id: "admin-id", role: "ADMIN" }
    next()
  },
}))

jest.mock("../middlewares/isAdmin.js", () => ({
  isAdmin: (req, res, next) => next(),
}))

import app from "../app.js"
import sendMail from "../util/mailSender.js"
import {
  sendDonationReceiptEmail,
  sendAdminDonationAlert,
  sendOfflinePledgeConfirmationEmail,
  sendContactFormEmails,
  sendVolunteerFormEmails,
  sendNewsletterWelcomeEmail,
} from "../services/emailService.js"

describe("Email Service & Donation Receipt Dispatch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Email Service Templates", () => {
    test("sendDonationReceiptEmail sends HTML receipt with 80G tax note", async () => {
      const mockDonation = {
        id: "don-123",
        firstName: "Aman",
        lastName: "Verma",
        email: "aman@example.com",
        amount: 5000,
        receiptNumber: "YUWA-2026-0001-abc12345",
        paymentMethod: "online",
        pan: "ABCDE1234F",
        createdAt: new Date("2026-10-15T10:00:00Z"),
      }

      await sendDonationReceiptEmail({
        donation: mockDonation,
        campaignTitle: "Child Education Care",
        receiptNumber: mockDonation.receiptNumber,
      })

      expect(sendMail).toHaveBeenCalledTimes(1)
      const [recipient, subject, html] = sendMail.mock.calls[0]
      expect(recipient).toBe("aman@example.com")
      expect(subject).toContain(mockDonation.receiptNumber)
      expect(html).toContain("YUWA-2026-0001-abc12345")
      expect(html).toContain("Five Thousand Rupees Only")
      expect(html).toContain("Section 80G")
      expect(html).toContain("ABCDE1234F")
    })

    test("sendOfflinePledgeConfirmationEmail sends payment transfer instructions", async () => {
      const mockDonation = {
        id: "don-pledge-999",
        firstName: "Pooja",
        lastName: "Sharma",
        email: "pooja@example.com",
        amount: 2500,
        createdAt: new Date(),
      }

      await sendOfflinePledgeConfirmationEmail({
        donation: mockDonation,
        campaignTitle: "Women Empowerment",
      })

      expect(sendMail).toHaveBeenCalledTimes(1)
      const [recipient, subject, html] = sendMail.mock.calls[0]
      expect(recipient).toBe("pooja@example.com")
      expect(subject).toContain("Donation Pledge Received")
      expect(html).toContain("Pending Verification")
      expect(html).toContain("YOUTH UTIL WELFARE ASSOCIATION")
    })

    test("sendContactFormEmails sends both user acknowledgement and admin alert", async () => {
      await sendContactFormEmails({
        name: "Rahul Singh",
        email: "rahul@example.com",
        phone: "9876543210",
        message: "I would like to partner with YUWA India.",
      })

      expect(sendMail).toHaveBeenCalledTimes(2)
      const userCall = sendMail.mock.calls[0]
      const adminCall = sendMail.mock.calls[1]

      expect(userCall[0]).toBe("rahul@example.com")
      expect(userCall[1]).toContain("We Received Your Message")

      const expectedAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "yuwaindia@gmail.com"
      expect(adminCall[0]).toBe(expectedAdminEmail)
      expect(adminCall[1]).toContain("Rahul Singh")
    })

    test("sendVolunteerFormEmails sends welcome to applicant and alert to admin", async () => {
      await sendVolunteerFormEmails({
        firstName: "Sneha",
        lastName: "Gupta",
        email: "sneha@example.com",
        phone: "9876543211",
        occupation: "Teacher",
        message: "Excited to teach children on weekends.",
      })

      const expectedAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "yuwaindia@gmail.com"
      expect(sendMail).toHaveBeenCalledTimes(2)
      expect(sendMail.mock.calls[0][0]).toBe("sneha@example.com")
      expect(sendMail.mock.calls[0][1]).toContain("Volunteer Community")
      expect(sendMail.mock.calls[1][0]).toBe(expectedAdminEmail)
      expect(sendMail.mock.calls[1][1]).toContain("Sneha Gupta")
    })
  })

  describe("POST /api/V1/admin/donation/:donationId/send-receipt-email", () => {
    test("successfully resends 80G receipt email for confirmed donation", async () => {
      const mockDonation = {
        id: "don-456",
        firstName: "Rohan",
        lastName: "Kapoor",
        email: "rohan@example.com",
        amount: 10000,
        status: "paid",
        receiptNumber: "YUWA-2026-0045-xyz98765",
        paymentMethod: "online",
        campaign: { id: "camp-1", title: { en: "Health Camp" } },
      }

      prisma.donation.findUnique.mockResolvedValue(mockDonation)

      const res = await request(app)
        .post(`/api/V1/admin/donation/${mockDonation.id}/send-receipt-email`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.msg).toContain("rohan@example.com")
      expect(sendMail).toHaveBeenCalledTimes(1)
    })

    test("rejects resend for unverified / pending donation", async () => {
      const mockPendingDonation = {
        id: "don-pending",
        firstName: "Vikas",
        email: "vikas@example.com",
        amount: 1000,
        status: "pending",
        receiptNumber: null,
      }

      prisma.donation.findUnique.mockResolvedValue(mockPendingDonation)

      const res = await request(app)
        .post(`/api/V1/admin/donation/${mockPendingDonation.id}/send-receipt-email`)

      expect(res.status).toBe(400)
      expect(res.body.message).toMatch(/confirmed/i)
      expect(sendMail).not.toHaveBeenCalled()
    })

    test("returns 404 if donation not found", async () => {
      prisma.donation.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post("/api/V1/admin/donation/non-existent-id/send-receipt-email")

      expect(res.status).toBe(404)
      expect(res.body.message).toMatch(/not found/i)
    })
  })
})
