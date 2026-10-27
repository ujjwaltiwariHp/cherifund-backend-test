import { prisma } from "../database/db.js"
import { logInfo, logError } from "../util/logHelper.js"
import { broadcastRealtimeEvent } from "./realtimeService.js"

/**
 * Creates a persistent notification in PostgreSQL and broadcasts it via SSE to active admin clients.
 *
 * @param {Object} params
 * @param {"donation"|"inquiry"|"campaign"|"offline_verification"} params.type
 * @param {string} params.title
 * @param {string} params.message
 * @param {Object} [params.metadata]
 * @returns {Promise<Object|null>}
 */
export const createNotification = async ({ type, title, message, metadata = {} }) => {
    try {
        const notification = await prisma.notification.create({
            data: {
                type,
                title,
                message,
                metadata,
                isRead: false
            }
        });

        logInfo(`[NotificationService] Notification created: [${type}] ${title}`);

        // Broadcast live notification event to connected admin SSE clients
        broadcastRealtimeEvent("notification:new", notification);

        return notification;
    } catch (error) {
        logError("[NotificationService] Failed to create notification:", error);
        return null;
    }
};

/**
 * Fetches count of unread notifications.
 * @returns {Promise<number>}
 */
export const getUnreadNotificationCount = async () => {
    try {
        return await prisma.notification.count({
            where: { isRead: false }
        });
    } catch (error) {
        logError("[NotificationService] Failed to count unread notifications:", error);
        return 0;
    }
};
