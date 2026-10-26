import {
    handleSseConnection,
    broadcastRealtimeEvent,
    getActiveClientCount
} from "../services/realtimeService.js"
import { EventEmitter } from "events"

describe("Realtime SSE Service Unit Tests", () => {
    let mockReq
    let mockRes

    beforeEach(() => {
        mockReq = new EventEmitter()
        mockReq.user = { email: "admin@example.com", role: "admin" }

        mockRes = {
            setHeader: jest.fn(),
            writeHead: jest.fn(),
            write: jest.fn(),
            end: jest.fn()
        }
    })

    test("handleSseConnection should configure SSE streaming headers and register client", () => {
        const initialCount = getActiveClientCount()

        handleSseConnection(mockReq, mockRes)

        expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }))

        expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining("event: connected"))
        expect(getActiveClientCount()).toBe(initialCount + 1)

        // Simulate client disconnect
        mockReq.emit("close")
        expect(getActiveClientCount()).toBe(initialCount)
    })

    test("broadcastRealtimeEvent should push formatted SSE events to connected clients", () => {
        handleSseConnection(mockReq, mockRes)

        const testPayload = {
            type: "online",
            amount: 5000,
            donorName: "Ananya Sharma"
        }

        broadcastRealtimeEvent("donation:created", testPayload)

        expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining("event: donation:created\ndata: ")
        )
        expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('"donorName":"Ananya Sharma"')
        )
        expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('"amount":5000')
        )

        mockReq.emit("close")
    })

    test("broadcastRealtimeEvent should safely drop broken client sockets", () => {
        const brokenRes = {
            setHeader: jest.fn(),
            writeHead: jest.fn(),
            write: jest.fn()
                .mockImplementationOnce(() => true)
                .mockImplementation(() => {
                    throw new Error("Client socket abruptly closed")
                }),
            end: jest.fn()
        }

        const brokenReq = new EventEmitter()
        handleSseConnection(brokenReq, brokenRes)

        const initialCount = getActiveClientCount()
        expect(initialCount).toBeGreaterThan(0)

        // Broadcasting should catch the write error and drop broken client
        broadcastRealtimeEvent("test:event", { foo: "bar" })

        expect(getActiveClientCount()).toBe(initialCount - 1)
    })

    test("broadcastRealtimeEvent without connected clients should execute without error", () => {
        expect(() => {
            broadcastRealtimeEvent("donation:created", { amount: 100 })
        }).not.toThrow()
    })
})
