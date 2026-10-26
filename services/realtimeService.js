import { logInfo, logError } from "../util/logHelper.js"

/**
 * Set of active Server-Sent Events (SSE) client response streams
 * @type {Set<import("express").Response>}
 */
const activeClients = new Set()

/**
 * Handles an incoming SSE connection request from authenticated admin clients.
 * Sets mandatory streaming headers, initializes keep-alive heartbeat, and registers client.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export const handleSseConnection = (req, res) => {
    // 1. Mandatory SSE headers for immediate flushing and Cloudflare/Nginx buffer bypass
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    })

    // 2. Send initial connection confirmation event
    try {
        const initialPayload = {
            status: "connected",
            adminEmail: req.user?.email || "admin",
            connectedAt: new Date().toISOString()
        }
        res.write(`event: connected\ndata: ${JSON.stringify(initialPayload)}\n\n`)
    } catch (_err) {
        return
    }

    // 3. Register client in active clients set
    activeClients.add(res)
    logInfo(`[RealtimeService] Admin client connected to SSE stream. Total active: ${activeClients.size}`)

    // 4. Heartbeat comment ping every 25 seconds to keep Cloudflare / reverse proxy tunnel open
    const heartbeatTimer = setInterval(() => {
        try {
            res.write(": ping\n\n")
        } catch (_err) {
            clearInterval(heartbeatTimer)
            activeClients.delete(res)
        }
    }, 25000)
    if (typeof heartbeatTimer.unref === "function") {
        heartbeatTimer.unref()
    }

    // 5. Cleanup on client disconnection
    req.on("close", () => {
        clearInterval(heartbeatTimer)
        activeClients.delete(res)
        logInfo(`[RealtimeService] Admin client disconnected from SSE stream. Total active: ${activeClients.size}`)
    })
}

/**
 * Broadcasts a named event with JSON payload to all active admin SSE connections.
 *
 * @param {string} eventName - e.g. "donation:created", "donation:verified", "campaign:updated", "inquiry:created"
 * @param {Object} payload - Data payload sent to clients
 */
export const broadcastRealtimeEvent = (eventName, payload = {}) => {
    if (activeClients.size === 0) return

    const safePayload = {
        ...payload,
        emittedAt: new Date().toISOString()
    }

    const sseMessage = `event: ${eventName}\ndata: ${JSON.stringify(safePayload)}\n\n`

    for (const client of activeClients) {
        try {
            client.write(sseMessage)
        } catch (error) {
            logError("[RealtimeService] Failed to write event to client stream, dropping client", error)
            activeClients.delete(client)
        }
    }
}

/**
 * Returns current count of active SSE streams (useful for diagnostics & tests)
 */
export const getActiveClientCount = () => activeClients.size
