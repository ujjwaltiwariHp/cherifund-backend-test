import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { numberToWordsINR } from "../util/receiptHelper.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Generates an official YUWA India 80G Tax Exemption Donation Certificate PDF
 * @param {Object} params
 * @param {Object} params.donation - Prisma Donation object
 * @param {string} [params.campaignTitle] - Target campaign or General Fund
 * @param {string} [params.receiptNumber] - Formatted Receipt Number
 * @returns {Promise<Buffer>} - Resolves with the binary PDF buffer
 */
export const generateDonationCertificatePdfBuffer = ({ donation, campaignTitle = "General Welfare Fund", receiptNumber }) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                layout: "landscape",
                margins: { top: 25, bottom: 25, left: 30, right: 30 }
            })

            const chunks = []
            doc.on("data", (chunk) => chunks.push(chunk))
            doc.on("end", () => resolve(Buffer.concat(chunks)))
            doc.on("error", (err) => reject(err))

            const width = 841.89
            const height = 595.28

            // --- 1. Decorative Double Outer Border ---
            // Outer Teal Border
            doc.rect(20, 20, width - 40, height - 40)
               .lineWidth(3)
               .strokeColor("#00715D")
               .stroke()

            // Inner Gold Accent Border
            doc.rect(26, 26, width - 52, height - 52)
               .lineWidth(1)
               .strokeColor("#F7941D")
               .stroke()

            // Corner Corner Embellishments
            const drawCornerMarker = (x, y) => {
                doc.circle(x, y, 3).fillColor("#00715D").fill()
            }
            drawCornerMarker(32, 32)
            drawCornerMarker(width - 32, 32)
            drawCornerMarker(32, height - 32)
            drawCornerMarker(width - 32, height - 32)

            // --- 2. Organization Header & Logo ---
            const logoPath = path.join(__dirname, "../assets/logo.png")
            const hasLogo = fs.existsSync(logoPath)

            if (hasLogo) {
                try {
                    doc.image(logoPath, 42, 36, { width: 95, height: 75, fit: [95, 75] })
                } catch (e) {
                    // Fallback gracefully if image cannot be read
                }
            }

            // Header Typography
            const headerLeft = hasLogo ? 145 : 50
            const headerWidth = width - headerLeft - 50

            doc.font("Helvetica-Bold")
               .fontSize(19)
               .fillColor("#00715D")
               .text("YOUTH UTIL WELFARE ASSOCIATION", headerLeft, 38, {
                   width: headerWidth,
                   align: "center"
               })

            doc.font("Helvetica")
               .fontSize(9)
               .fillColor("#4B5563")
               .text("Registered under the Societies Registration Act XXI of 1860 | Registration No: SOCIETY/WEST/ 2016/8902080", headerLeft, 61, {
                   width: headerWidth,
                   align: "center"
               })

            doc.font("Helvetica")
               .fontSize(8)
               .fillColor("#6B7280")
               .text("Head Office: H.No. RZC-13, KH. No. 72/23, 78/3, Nihal Vihar, Nangloi, New Delhi - 110041", headerLeft, 75, {
                   width: headerWidth,
                   align: "center"
               })
               .text("Branch: 393i, Rajiv Nagar, West Basharatpur, Gorakhpur (U.P.) - 273001 | Email: yuwaindia@gmail.com | Web: yuwaindia.org", headerLeft, 87, {
                   width: headerWidth,
                   align: "center"
               })

            // Thin separator
            doc.moveTo(40, 106)
               .lineTo(width - 40, 106)
               .lineWidth(0.8)
               .strokeColor("#E5E7EB")
               .stroke()

            // --- 3. Certificate Ribbon Banner ---
            const bannerY = 114
            doc.roundedRect(120, bannerY, width - 240, 26, 4)
               .fillColor("#00715D")
               .fill()

            doc.font("Helvetica-Bold")
               .fontSize(11)
               .fillColor("#FFFFFF")
               .text("OFFICIAL 80G DONATION RECEIPT & TAX EXEMPTION CERTIFICATE", 120, bannerY + 7, {
                   width: width - 240,
                   align: "center"
               })

            // --- 4. Main Details Card ---
            const cardY = 150
            const cardWidth = width - 80
            const cardHeight = 245

            doc.roundedRect(40, cardY, cardWidth, cardHeight, 6)
               .fillColor("#F9FAFB")
               .fill()
               .lineWidth(1)
               .strokeColor("#E5E7EB")
               .stroke()

            // Vertical Column Divider
            const midX = 40 + cardWidth / 2
            doc.moveTo(midX, cardY + 12)
               .lineTo(midX, cardY + cardHeight - 12)
               .lineWidth(0.8)
               .strokeColor("#E5E7EB")
               .stroke()

            // Data extraction
            const finalReceiptNo = receiptNumber || donation.receiptNumber || "YUWA-RECEIPT"
            const donorName = `${donation.firstName || ""} ${donation.lastName || ""}`.trim() || donation.donorName || "Valued Supporter"
            const donorEmail = donation.email || "—"
            const donorPhone = donation.phone || "—"
            const donorAddress = donation.address || "—"
            const donorPan = donation.pan && donation.pan.trim() ? donation.pan.trim().toUpperCase() : "NOT PROVIDED"
            const amount = Number(donation.amount || 0)
            const formattedAmount = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount)
            const amountInWords = numberToWordsINR(amount)
            const donationDate = donation.createdAt ? new Date(donation.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }) : new Date().toLocaleDateString("en-IN")

            const paymentMethodStr = (donation.paymentMethod || "ONLINE").toUpperCase()
            const txRef = donation.razorpayId || donation.orderId || donation.id || "Direct Verified"

            // --- Left Column Fields ---
            const leftX = 58
            let currY = cardY + 18
            const lineGap = 36

            const renderField = (label, val, x, y, valColor = "#111827", isBold = false) => {
                doc.font("Helvetica-Bold")
                   .fontSize(8.5)
                   .fillColor("#6B7280")
                   .text(label.toUpperCase(), x, y)

                doc.font(isBold ? "Helvetica-Bold" : "Helvetica")
                   .fontSize(10.5)
                   .fillColor(valColor)
                   .text(String(val), x, y + 12, { width: (cardWidth / 2) - 40, ellipsis: true })
            }

            renderField("Receipt Number", finalReceiptNo, leftX, currY, "#00715D", true)
            currY += lineGap

            renderField("Date of Contribution", donationDate, leftX, currY)
            currY += lineGap

            renderField("Donor Full Name", donorName, leftX, currY, "#111827", true)
            currY += lineGap

            renderField("Donor PAN (Tax ID)", donorPan, leftX, currY, donorPan !== "NOT PROVIDED" ? "#00715D" : "#6B7280", true)
            currY += lineGap

            renderField("Address / Contact", `${donorAddress} | ${donorPhone}`, leftX, currY)
            currY += lineGap

            renderField("Donor Email", donorEmail, leftX, currY)

            // --- Right Column Fields ---
            const rightX = midX + 22
            let rightY = cardY + 18

            // Big Amount Box
            doc.roundedRect(rightX, rightY, (cardWidth / 2) - 40, 48, 4)
               .fillColor("#ECFDF5")
               .fill()
               .lineWidth(1)
               .strokeColor("#A7F3D0")
               .stroke()

            doc.font("Helvetica-Bold")
               .fontSize(8.5)
               .fillColor("#065F46")
               .text("TOTAL AMOUNT RECEIVED", rightX + 12, rightY + 8)

            doc.font("Helvetica-Bold")
               .fontSize(18)
               .fillColor("#00715D")
               .text(`INR ₹ ${formattedAmount}`, rightX + 12, rightY + 22)

            rightY += 58

            renderField("Amount in Words", amountInWords, rightX, rightY, "#111827", true)
            rightY += lineGap

            renderField("Cause / Campaign", campaignTitle, rightX, rightY, "#1D4ED8", true)
            rightY += lineGap

            renderField("Payment Mode", paymentMethodStr, rightX, rightY)
            rightY += lineGap

            renderField("Transaction Reference / Order ID", txRef, rightX, rightY, "#4B5563")

            // --- 5. Statutory 80G Declaration Note ---
            const noteY = 405
            doc.roundedRect(40, noteY, cardWidth, 42, 4)
               .fillColor("#FEF3C7")
               .fill()
               .lineWidth(0.8)
               .strokeColor("#FCD34D")
               .stroke()

            doc.font("Helvetica-Bold")
               .fontSize(8.5)
               .fillColor("#92400E")
               .text("STATUTORY TAX DEDUCTION CLAUSE (SECTION 80G OF INCOME TAX ACT, 1961):", 52, noteY + 7)

            doc.font("Helvetica")
               .fontSize(7.8)
               .fillColor("#78350F")
               .text("Donations to Youth Util Welfare Association are eligible for tax deduction under Section 80G(5)(vi) of the Income Tax Act, 1961. This electronic receipt is digitally generated and verified on yuwaindia.org. No physical signature is required pursuant to the Information Technology Act, 2000.", 52, noteY + 19, {
                   width: cardWidth - 24,
                   lineGap: 1.5
               })

            // --- 6. Footer & Signatures ---
            const footerY = 462

            // Left: Verification Stamp / Badge
            doc.roundedRect(48, footerY, 190, 60, 4)
               .lineWidth(0.8)
               .strokeColor("#D1D5DB")
               .stroke()

            doc.font("Helvetica-Bold")
               .fontSize(8)
               .fillColor("#00715D")
               .text("YOUTH UTIL WELFARE ASSOCIATION", 54, footerY + 8, { width: 178, align: "center" })

            doc.font("Helvetica")
               .fontSize(7.5)
               .fillColor("#4B5563")
               .text("DIGITALLY SIGNED & VERIFIED", 54, footerY + 22, { width: 178, align: "center" })
               .text("Reg: SOCIETY/WEST/ 2016/8902080", 54, footerY + 34, { width: 178, align: "center" })
               .text("yuwaindia.org", 54, footerY + 46, { width: 178, align: "center" })

            // Center: Thank you message
            doc.font("Helvetica-Oblique")
               .fontSize(9.5)
               .fillColor("#00715D")
               .text('"Thank you for your noble generosity. Your support directly transforms lives across India."', 260, footerY + 18, {
                   width: 320,
                   align: "center"
               })

            // Right: Authorized Signatory
            const sigX = width - 230
            doc.moveTo(sigX, footerY + 38)
               .lineTo(sigX + 180, footerY + 38)
               .lineWidth(1)
               .strokeColor("#9CA3AF")
               .stroke()

            doc.font("Helvetica-Bold")
               .fontSize(9)
               .fillColor("#111827")
               .text("Authorized Signatory", sigX, footerY + 43, { width: 180, align: "center" })

            doc.font("Helvetica")
               .fontSize(7.5)
               .fillColor("#6B7280")
               .text("Youth Util Welfare Association", sigX, footerY + 54, { width: 180, align: "center" })

            // Bottom timestamp
            doc.font("Helvetica")
               .fontSize(7)
               .fillColor("#9CA3AF")
               .text(`Generated on ${new Date().toUTCString()} | Receipt ID: ${finalReceiptNo}`, 40, height - 23, {
                   width: width - 80,
                   align: "center"
               })

            doc.end()
        } catch (error) {
            reject(error)
        }
    })
}
