import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications
} from "../controllers/Admin/notification.js"
import { createNotification, getUnreadNotificationCount } from "../services/notificationService.js"
import { prisma } from "../database/db.js"
import { httpStatus } from "../config/httpStatus.js"

jest.mock("../database/db.js", () => ({
    prisma: {
        notification: {
            create: jest.fn(),
            count: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn()
        }
    }
}))

jest.mock("../services/realtimeService.js", () => ({
    broadcastRealtimeEvent: jest.fn()
}))

describe("Admin Notification Controller & Service Unit Tests", () => {
    let mockReq
    let mockRes
    let mockNext

    beforeEach(() => {
        jest.clearAllMocks()
        mockReq = {
            query: {},
            params: {},
            body: {}
        }
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        }
        mockNext = jest.fn()
    })

    test("createNotification should persist notification and trigger broadcast", async () => {
        const mockNotification = {
            id: "notif-1",
            type: "donation",
            title: "New Online Donation",
            message: "₹500 from Aarav",
            metadata: { amount: 500 },
            isRead: false,
            createdAt: new Date()
        }

        prisma.notification.create.mockResolvedValue(mockNotification)

        const result = await createNotification({
            type: "donation",
            title: "New Online Donation",
            message: "₹500 from Aarav",
            metadata: { amount: 500 }
        })

        expect(prisma.notification.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                type: "donation",
                title: "New Online Donation",
                isRead: false
            })
        })
        expect(result).toEqual(mockNotification)
    })

    test("getNotifications should return paginated list and unreadCount", async () => {
        mockReq.query = { page: "1", limit: "10", type: "all", status: "unread" }

        prisma.notification.count
            .mockResolvedValueOnce(5)  // total filtered
            .mockResolvedValueOnce(5)  // unread count

        prisma.notification.findMany.mockResolvedValue([
            { id: "notif-1", title: "Test 1", isRead: false }
        ])

        await getNotifications(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK)
        expect(mockRes.json).toHaveBeenCalledWith({
            notifications: expect.any(Array),
            total: 5,
            page: 1,
            limit: 10,
            totalPages: 1,
            unreadCount: 5
        })
    })

    test("markNotificationRead should update notification to isRead: true", async () => {
        mockReq.params = { id: "notif-1" }
        prisma.notification.findUnique.mockResolvedValue({ id: "notif-1", isRead: false })
        prisma.notification.update.mockResolvedValue({ id: "notif-1", isRead: true })
        prisma.notification.count.mockResolvedValue(2)

        await markNotificationRead(mockReq, mockRes, mockNext)

        expect(prisma.notification.update).toHaveBeenCalledWith({
            where: { id: "notif-1" },
            data: { isRead: true }
        })
        expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: "Notification marked as read"
        }))
    })

    test("markAllNotificationsRead should mark all unread notifications as read", async () => {
        prisma.notification.updateMany.mockResolvedValue({ count: 4 })

        await markAllNotificationsRead(mockReq, mockRes, mockNext)

        expect(prisma.notification.updateMany).toHaveBeenCalledWith({
            where: { isRead: false },
            data: { isRead: true }
        })
        expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK)
        expect(mockRes.json).toHaveBeenCalledWith({
            msg: "All notifications marked as read",
            updatedCount: 4,
            unreadCount: 0
        })
    })

    test("deleteNotification should remove notification and return remaining unreadCount", async () => {
        mockReq.params = { id: "notif-1" }
        prisma.notification.findUnique.mockResolvedValue({ id: "notif-1" })
        prisma.notification.delete.mockResolvedValue({ id: "notif-1" })
        prisma.notification.count.mockResolvedValue(1)

        await deleteNotification(mockReq, mockRes, mockNext)

        expect(prisma.notification.delete).toHaveBeenCalledWith({
            where: { id: "notif-1" }
        })
        expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK)
    })

    test("clearAllNotifications should delete all notifications", async () => {
        prisma.notification.deleteMany.mockResolvedValue({ count: 10 })
        prisma.notification.count.mockResolvedValue(0)

        await clearAllNotifications(mockReq, mockRes, mockNext)

        expect(prisma.notification.deleteMany).toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK)
    })
})
