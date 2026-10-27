import { httpStatus } from "../../config/httpStatus.js"
import { prisma } from "../../database/db.js"
import { logError } from "../../util/logHelper.js"
import { errorHandler } from "../../util/errorHandler.js"
import { broadcastRealtimeEvent } from "../../services/realtimeService.js"

/**
 * GET /api/V1/admin/notification
 * Fetches paginated notifications with optional filters (type, status).
 */
export const getNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { type, status } = req.query;

        const where = {};

        // Filter by notification type
        if (type && type !== "all") {
            if (type === "donation") {
                where.type = { in: ["donation", "offline_verification"] };
            } else if (type === "inquiry") {
                where.type = "inquiry";
            } else if (type === "campaign") {
                where.type = "campaign";
            } else {
                where.type = type;
            }
        }

        // Filter by read/unread status
        if (status === "unread") {
            where.isRead = false;
        } else if (status === "read") {
            where.isRead = true;
        }

        const [total, notifications, unreadCount] = await Promise.all([
            prisma.notification.count({ where }),
            prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" }
            }),
            prisma.notification.count({ where: { isRead: false } })
        ]);

        res.status(httpStatus.OK).json({
            notifications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            unreadCount
        });
    } catch (error) {
        logError("[AdminNotification] Error fetching notifications:", error);
        next(error);
    }
};

/**
 * PATCH /api/V1/admin/notification/:id/read
 * Marks an individual notification as read.
 */
export const markNotificationRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.notification.findUnique({
            where: { id }
        });

        if (!existing) {
            return next(errorHandler({
                status: httpStatus.NOT_FOUND,
                message: "Notification not found"
            }));
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        const unreadCount = await prisma.notification.count({ where: { isRead: false } });

        broadcastRealtimeEvent("notification:updated", {
            id,
            isRead: true,
            unreadCount
        });

        res.status(httpStatus.OK).json({
            msg: "Notification marked as read",
            notification: updated,
            unreadCount
        });
    } catch (error) {
        logError("[AdminNotification] Error marking notification as read:", error);
        next(error);
    }
};

/**
 * PATCH /api/V1/admin/notification/mark-all-read
 * Marks all unread notifications as read.
 */
export const markAllNotificationsRead = async (req, res, next) => {
    try {
        const result = await prisma.notification.updateMany({
            where: { isRead: false },
            data: { isRead: true }
        });

        broadcastRealtimeEvent("notification:all_read", { unreadCount: 0 });

        res.status(httpStatus.OK).json({
            msg: "All notifications marked as read",
            updatedCount: result.count,
            unreadCount: 0
        });
    } catch (error) {
        logError("[AdminNotification] Error marking all notifications as read:", error);
        next(error);
    }
};

/**
 * DELETE /api/V1/admin/notification/:id
 * Deletes an individual notification.
 */
export const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.notification.findUnique({
            where: { id }
        });

        if (!existing) {
            return next(errorHandler({
                status: httpStatus.NOT_FOUND,
                message: "Notification not found"
            }));
        }

        await prisma.notification.delete({
            where: { id }
        });

        const unreadCount = await prisma.notification.count({ where: { isRead: false } });

        broadcastRealtimeEvent("notification:deleted", {
            id,
            unreadCount
        });

        res.status(httpStatus.OK).json({
            msg: "Notification deleted successfully",
            deletedId: id,
            unreadCount
        });
    } catch (error) {
        logError("[AdminNotification] Error deleting notification:", error);
        next(error);
    }
};

/**
 * DELETE /api/V1/admin/notification/clear-all
 * Clears notifications (deletes all notifications or all read).
 */
export const clearAllNotifications = async (req, res, next) => {
    try {
        const { onlyRead } = req.query;

        const where = onlyRead === "true" ? { isRead: true } : {};

        const result = await prisma.notification.deleteMany({
            where
        });

        const unreadCount = await prisma.notification.count({ where: { isRead: false } });

        broadcastRealtimeEvent("notification:cleared", { unreadCount });

        res.status(httpStatus.OK).json({
            msg: onlyRead === "true" ? "Read notifications cleared" : "All notifications cleared",
            deletedCount: result.count,
            unreadCount
        });
    } catch (error) {
        logError("[AdminNotification] Error clearing notifications:", error);
        next(error);
    }
};
