import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { numberToWordsINR } from "../util/receiptHelper.js"
import { logInfo, logWarn, logError } from "../util/logHelper.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Normalizes donation data to the standard DonationReceipt payload structure
 * used by charifund-frontend/src/lib/certificate/generateCertificateHtml.ts
 */
const buildStandardReceiptPayload = ({ donation, campaignTitle = "General Welfare Fund", receiptNumber }) => {
    const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ").trim() || donation.donorName || "Valued Supporter"
    const amountNum = Number(donation.amount || 0)
    const amountWords = numberToWordsINR(amountNum)
    const finalReceiptNo = receiptNumber || donation.receiptNumber || (donation.id ? `YUWA-${new Date().getFullYear()}-0001-${String(donation.id).slice(-4)}` : "YUWA-PENDING")

    const isOffline = typeof donation.paymentMethod === "string" && (
        donation.paymentMethod.toLowerCase().includes("offline") ||
        donation.paymentMethod.toLowerCase().includes("cash") ||
        donation.paymentMethod.toLowerCase().includes("cheque") ||
        donation.paymentMethod.toLowerCase().includes("bank") ||
        donation.paymentMethod.toLowerCase().includes("neft") ||
        donation.paymentMethod.toLowerCase().includes("rtgs") ||
        donation.paymentMethod.toLowerCase().includes("dd")
    )

    const defaultPaymentId = isOffline ? "Direct Offline" : "ONLINE"
    const paymentIdentifier = donation.razorpayId || donation.orderId || (donation.id ? String(donation.id) : defaultPaymentId)

    return {
        receiptNumber: finalReceiptNo,
        orderId: donation.orderId || (donation.id ? String(donation.id) : ""),
        paymentId: paymentIdentifier,
        paymentMethod: isOffline ? "offline" : (donation.paymentMethod || "online"),
        paymentStatus: donation.status || "completed",
        paymentDate: donation.createdAt ? new Date(donation.createdAt).toISOString() : new Date().toISOString(),
        amount: amountNum,
        amountInWords: amountWords,
        currency: "INR",
        campaignTitle: campaignTitle || "General Welfare Fund",
        campaignId: donation.campaignId ? String(donation.campaignId) : undefined,
        donor: {
            name: donorName,
            email: donation.email || "",
            phone: donation.phone || "",
            address: donation.address || "",
            pan: donation.pan && donation.pan.trim() && donation.pan.trim() !== "-" ? donation.pan.trim().toUpperCase() : undefined
        },
        organization: {
            name: "YOUTH UTIL WELFARE ASSOCIATION",
            address: "H.No. RZC-13, KH. No. 72/23, 78/3, Nihal Vihar, Nangloi, New Delhi-110041",
            email: "yuwaaindia@gmail.com",
            phone: "9450886855, 7394886855",
            website: "yuwaindia.org",
            regNumber: "SOCIETY/WEST/ 2016/8902080"
        },
        isVerified: true
    }
}

/**
 * Attempts to retrieve the exact official PDF certificate rendered by the frontend's
 * Puppeteer export endpoint (/api/donation-certificate/export)
 */
const fetchPdfFromFrontendExport = async (receiptPayload) => {
    const candidateUrls = [
        process.env.FRONTEND_URL,
        process.env.NEXT_PUBLIC_FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://yuwaindia.org"
    ].filter(Boolean)

    // Deduplicate candidate URLs
    const uniqueUrls = [...new Set(candidateUrls)]

    for (const baseUrl of uniqueUrls) {
        try {
            const cleanBase = baseUrl.replace(/\/$/, "")
            const exportUrl = `${cleanBase}/api/donation-certificate/export`

            const response = await fetch(exportUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receipt: receiptPayload,
                    format: "pdf"
                }),
                signal: AbortSignal.timeout(6000)
            })

            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                if (buffer && buffer.length > 1000) {
                    logInfo(`[CertificatePdfService] Successfully fetched exact website certificate from ${exportUrl}`)
                    return buffer
                }
            }
        } catch (fetchErr) {
            // Silently try next candidate URL
        }
    }
    return null
}

/**
 * Fallback PDF generator using PDFKit that exactly mirrors the website certificate
 * design, typography, color palette, dimensions (880x520), and layout specifications.
 */
const generateFallbackCertificatePdf = (receiptPayload) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: [880, 520],
                margins: { top: 0, bottom: 0, left: 0, right: 0 }
            })

            const chunks = []
            doc.on("data", (chunk) => chunks.push(chunk))
            doc.on("end", () => resolve(Buffer.concat(chunks)))
            doc.on("error", (err) => reject(err))

            const width = 880
            const height = 520

            // Helper to draw dotted underline
            const drawDottedLine = (x1, x2, y) => {
                doc.save()
                   .moveTo(x1, y)
                   .lineTo(x2, y)
                   .lineWidth(0.8)
                   .dash(1.5, { space: 2.5 })
                   .strokeColor("#4b5563")
                   .stroke()
                   .restore()
            }

            // --- 1. Double Navy Border (Identical to Website .cert-outer & .cert-inner) ---
            // Outer Navy Border (4px solid #003366)
            doc.rect(10, 10, width - 20, height - 20)
               .lineWidth(4)
               .strokeColor("#003366")
               .stroke()

            // Inner Navy Border (1.5px solid #003366)
            doc.rect(18, 18, width - 36, height - 36)
               .lineWidth(1.5)
               .strokeColor("#003366")
               .stroke()

            // --- 2. Header Section ---
            // Left: Official Logo
            const logoCandidates = [
                path.join(__dirname, "../assets/LogoO.png"),
                path.join(__dirname, "../assets/logo.png"),
                path.join(process.cwd(), "../charifund-frontend/public/assets/LogoO.webp")
            ]
            const logoPath = logoCandidates.find((p) => fs.existsSync(p))

            if (logoPath) {
                try {
                    doc.image(logoPath, 34, 28, { fit: [112, 54] })
                } catch (_imgErr) {
                    // Fallback gracefully if image cannot be parsed
                }
            }

            // Serial Number Box (No. [ 0001 ])
            let serialNumber = "0001"
            if (receiptPayload.receiptNumber) {
                const parts = receiptPayload.receiptNumber.split("-")
                if (parts.length >= 3) {
                    serialNumber = parts[2]
                } else {
                    serialNumber = receiptPayload.receiptNumber.slice(-4)
                }
            }

            doc.font("Helvetica-Bold")
               .fontSize(12)
               .fillColor("#1f2937")
               .text("No.", 34, 94)

            doc.roundedRect(54, 88, 68, 26, 3)
               .fillColor("#f9fafb")
               .fill()
               .lineWidth(0.8)
               .strokeColor("#d1d5db")
               .stroke()

            doc.font("Helvetica-Bold")
               .fontSize(18)
               .fillColor("#111827")
               .text(serialNumber, 54, 92, { width: 68, align: "center" })

            doc.font("Helvetica-Bold")
               .fontSize(8.5)
               .fillColor("#374151")
               .text("Receipt No.: ", 34, 122, { continued: true })
               .font("Courier-Bold")
               .fillColor("#003366")
               .text(receiptPayload.receiptNumber)

            // Center Header: Organization Details
            const org = receiptPayload.organization || {}
            doc.font("Helvetica-Bold")
               .fontSize(18)
               .fillColor("#003366")
               .text(org.name || "YOUTH UTIL WELFARE ASSOCIATION", 185, 26, {
                   width: 510,
                   align: "center"
               })

            doc.font("Helvetica-Bold")
               .fontSize(9.5)
               .fillColor("#003366")
               .text("Registered Under 12AA/80G", 185, 48, {
                   width: 510,
                   align: "center"
               })

            // Registration Pill (Navy Blue)
            doc.roundedRect(300, 62, 280, 16, 8)
               .fillColor("#003366")
               .fill()

            doc.font("Helvetica-Bold")
               .fontSize(8)
               .fillColor("#ffffff")
               .text(`REGISTRATION NO. : ${org.regNumber || "SOCIETY/WEST/ 2016/8902080"}`, 300, 66, {
                   width: 280,
                   align: "center"
               })

            doc.font("Helvetica-Bold")
               .fontSize(8.5)
               .fillColor("#1f2937")
               .text(`Mob. No. : ${org.phone || "9450886855, 7394886855"}`, 185, 82, {
                   width: 510,
                   align: "center"
               })

            doc.font("Helvetica")
               .fontSize(8)
               .fillColor("#374151")
               .text(`website: ${org.website || "yuwaindia.org"} • E-mail: ${org.email || "yuwaaindia@gmail.com"}`, 185, 94, {
                   width: 510,
                   align: "center"
               })

            doc.font("Helvetica")
               .fontSize(7.5)
               .fillColor("#4b5563")
               .text(`Head Off.: ${org.address || "H.No. RZC-13, KH. No. 72/23, 78/3, Nihal Vihar, Nangloi, New Delhi-110041"}`, 185, 106, {
                   width: 510,
                   align: "center"
               })
               .text("Branch Off.: 393i, Rajiv Nagar, West Basharatpur, Gorakhpur (U.P.)-273001", 185, 117, {
                   width: 510,
                   align: "center"
               })

            // Right Header: Receipt Pill, Date & 80G Tax Exemption Box
            doc.roundedRect(710, 26, 136, 18, 9)
               .fillColor("#002244")
               .fill()

            doc.font("Helvetica-Bold")
               .fontSize(9)
               .fillColor("#ffffff")
               .text("DONATION RECEIPT", 710, 30, {
                   width: 136,
                   align: "center"
               })

            let formattedDate = ""
            try {
                const d = new Date(receiptPayload.paymentDate)
                const day = String(d.getDate()).padStart(2, "0")
                const month = String(d.getMonth() + 1).padStart(2, "0")
                const year = d.getFullYear()
                formattedDate = `${day} / ${month} / ${year}`
            } catch (_err) {
                formattedDate = new Date().toLocaleDateString("en-IN")
            }

            doc.font("Helvetica-Bold")
               .fontSize(9.5)
               .fillColor("#1f2937")
               .text("Date :", 710, 52)
               .font("Helvetica-Bold")
               .fillColor("#111827")
               .text(formattedDate, 750, 52, { width: 96, align: "center" })

            drawDottedLine(750, 846, 64)

            // Tax Benefit Box
            doc.roundedRect(700, 72, 146, 46, 4)
               .fillColor("#f9fafb")
               .fill()
               .lineWidth(0.8)
               .strokeColor("#9ca3af")
               .stroke()

            doc.font("Helvetica-Bold")
               .fontSize(7.5)
               .fillColor("#374151")
               .text("Donations are eligible for tax exemption under Section 80G of the Income Tax Act.", 706, 80, {
                   width: 134,
                   align: "center"
               })

            // Divider Line
            doc.moveTo(34, 138)
               .lineTo(width - 34, 138)
               .lineWidth(0.8)
               .strokeColor("#d1d5db")
               .stroke()

            // --- 3. Body Section with Dotted Underlines ---
            const bodyLeft = 34
            let currY = 158
            const donor = receiptPayload.donor || {}
            const donorName = (donor.name || "Generous Donor").toUpperCase()
            const donorAddress = donor.address || "—"
            const donorPhone = donor.phone || "—"
            const donorPan = donor.pan ? donor.pan.toUpperCase() : null

            // Row 1: Received with thanks from
            doc.font("Times-Italic")
               .fontSize(11)
               .fillColor("#1f2937")
               .text("Received with thanks from :", bodyLeft, currY)

            doc.font("Helvetica-Bold")
               .fontSize(12)
               .fillColor("#111827")
               .text(donorName, bodyLeft + 160, currY - 1, { width: width - 34 - (bodyLeft + 160), ellipsis: true })

            drawDottedLine(bodyLeft + 155, width - 34, currY + 13)
            currY += 34

            // Row 2: Address & Mobile
            doc.font("Times-Italic")
               .fontSize(10.5)
               .fillColor("#1f2937")
               .text("Address :", bodyLeft, currY)

            doc.font("Helvetica")
               .fontSize(10.5)
               .fillColor("#1f2937")
               .text(donorAddress, bodyLeft + 60, currY, { width: 480, ellipsis: true })

            drawDottedLine(bodyLeft + 55, 570, currY + 13)

            doc.font("Times-Italic")
               .fontSize(10.5)
               .fillColor("#1f2937")
               .text("Mobile :", 585, currY)

            doc.font("Helvetica-Bold")
               .fontSize(10.5)
               .fillColor("#111827")
               .text(donorPhone, 635, currY, { width: width - 34 - 635, align: "center" })

            drawDottedLine(630, width - 34, currY + 13)
            currY += 34

            // Row 3: Sum of Rupees (in words)
            doc.font("Times-Italic")
               .fontSize(11)
               .fillColor("#1f2937")
               .text("The sum of Rupees (in words) :", bodyLeft, currY)

            doc.font("Helvetica-BoldOblique")
               .fontSize(11)
               .fillColor("#111827")
               .text(receiptPayload.amountInWords || "", bodyLeft + 185, currY, { width: width - 34 - (bodyLeft + 185), ellipsis: true })

            drawDottedLine(bodyLeft + 180, width - 34, currY + 13)
            currY += 34

            // Row 4: Cash / Cheque / UPI / NEFT No. & Dated & Currency Box
            const isOffline = receiptPayload.paymentMethod === "offline"
            const modeTag = isOffline ? " (Offline)" : " (Online)"
            const paymentIdDisplay = `${receiptPayload.paymentId || "ONLINE"}${modeTag}`

            doc.font("Times-Italic")
               .fontSize(10)
               .fillColor("#1f2937")
               .text("Cash / Cheque / UPI / NEFT No. :", bodyLeft, currY)

            doc.font("Courier-Bold")
               .fontSize(9.5)
               .fillColor("#003366")
               .text(paymentIdDisplay, bodyLeft + 168, currY + 1, { width: 310, ellipsis: true })

            drawDottedLine(bodyLeft + 164, 480, currY + 13)

            doc.font("Times-Italic")
               .fontSize(10)
               .fillColor("#1f2937")
               .text("Dated :", 490, currY)

            doc.font("Helvetica-Bold")
               .fontSize(9.5)
               .fillColor("#111827")
               .text(formattedDate, 532, currY + 1, { width: 110, align: "center" })

            drawDottedLine(528, 644, currY + 13)

            // Currency Box on Right (Gold border #a3704c, INR amount)
            const formattedAmountStr = new Intl.NumberFormat("en-IN", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 0
            }).format(receiptPayload.amount || 0)

            doc.roundedRect(680, currY - 6, 166, 50, 6)
               .fillColor("#fef3c7")
               .fill()
               .lineWidth(2)
               .strokeColor("#a3704c")
               .stroke()

            doc.font("Helvetica-Bold")
               .fontSize(17)
               .fillColor("#111827")
               .text(`Rs. ${formattedAmountStr} /-`, 680, currY + 12, { width: 166, align: "center" })

            currY += 32

            // Row 5: Purpose of Donation
            doc.font("Times-Italic")
               .fontSize(10.5)
               .fillColor("#1f2937")
               .text("On account of / Purpose of Donation :", bodyLeft, currY)

            doc.font("Helvetica-Bold")
               .fontSize(11)
               .fillColor("#111827")
               .text(receiptPayload.campaignTitle || "General Welfare Fund", bodyLeft + 205, currY, { width: 440, ellipsis: true })

            drawDottedLine(bodyLeft + 200, 650, currY + 13)

            // Optional Row 6: Donor PAN
            if (donorPan) {
                currY += 30
                doc.font("Times-Italic")
                   .fontSize(10.5)
                   .fillColor("#1f2937")
                   .text("Donor PAN (if Applicable) :", bodyLeft, currY)

                doc.font("Courier-Bold")
                   .fontSize(11)
                   .fillColor("#111827")
                   .text(donorPan, bodyLeft + 165, currY)

                drawDottedLine(bodyLeft + 160, 650, currY + 13)
            }

            // Divider Line above footer
            doc.moveTo(34, 412)
               .lineTo(width - 34, 412)
               .lineWidth(0.8)
               .strokeColor("#d1d5db")
               .stroke()

            // --- 4. Footer Section ---
            // Left: Maroon "DONOR COPY" Badge (#5a1818)
            doc.roundedRect(34, 432, 96, 20, 2)
               .fillColor("#5a1818")
               .fill()

            doc.font("Helvetica-Bold")
               .fontSize(9)
               .fillColor("#ffffff")
               .text("DONOR COPY", 34, 437, { width: 96, align: "center" })

            // Center: Gratitude Pill & Text
            doc.roundedRect(260, 424, 360, 24, 12)
               .fillColor("#002244")
               .fill()
               .lineWidth(1)
               .strokeColor("#003366")
               .stroke()

            doc.font("Times-Bold")
               .fontSize(11)
               .fillColor("#fbc531")
               .text("Thanks You for Your Generous Donation", 260, 430, {
                   width: 360,
                   align: "center"
               })

            doc.font("Times-Italic")
               .fontSize(9)
               .fillColor("#374151")
               .text("Your contribution helps us serve humanity.", 260, 452, {
                   width: 360,
                   align: "center"
               })

            doc.font("Helvetica")
               .fontSize(7.5)
               .fillColor("#6b7280")
               .text("All donations are accepted subject to the rules and regulations of the Association.*", 260, 465, {
                   width: 360,
                   align: "center"
               })

            // Right: Authorised Signatory Block
            doc.font("Helvetica-Bold")
               .fontSize(9)
               .fillColor("#003366")
               .text(org.name || "YOUTH UTIL WELFARE ASSOCIATION", 680, 426, {
                   width: 166,
                   align: "center"
               })

            doc.moveTo(695, 462)
               .lineTo(835, 462)
               .lineWidth(0.8)
               .strokeColor("#374151")
               .stroke()

            doc.font("Times-Italic")
               .fontSize(9.5)
               .fillColor("#1f2937")
               .text("Authorised Signatory", 680, 466, {
                   width: 166,
                   align: "center"
               })

            doc.end()
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * Generates an official YUWA India 80G Tax Exemption Donation Certificate PDF
 * strictly using the exact same design, layout, and colors as the website certificate.
 *
 * It first queries the frontend's Puppeteer export endpoint to obtain the 100% pixel-perfect
 * identical certificate, and falls back to a matching PDFKit generator if the frontend is unreachable.
 *
 * @param {Object} params
 * @param {Object} params.donation - Prisma Donation object
 * @param {string} [params.campaignTitle] - Target campaign or General Welfare Fund
 * @param {string} [params.receiptNumber] - Formatted Receipt Number
 * @returns {Promise<Buffer>} - Resolves with the binary PDF buffer
 */
export const generateDonationCertificatePdfBuffer = async ({ donation, campaignTitle = "General Welfare Fund", receiptNumber }) => {
    const receiptPayload = buildStandardReceiptPayload({ donation, campaignTitle, receiptNumber })

    // 1. Try to fetch the exact Puppeteer-rendered PDF from frontend export endpoint
    const websitePdfBuffer = await fetchPdfFromFrontendExport(receiptPayload)
    if (websitePdfBuffer) {
        return websitePdfBuffer
    }

    // 2. Fallback to pixel-aligned PDFKit generator matching exact same website template
    logWarn("[CertificatePdfService] Frontend export route unavailable. Rendering identical fallback certificate via PDFKit.")
    return generateFallbackCertificatePdf(receiptPayload)
}
