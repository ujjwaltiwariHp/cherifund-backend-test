import sendMail from "../util/mailSender.js"
import { logError, logInfo } from "../util/logHelper.js"
import { numberToWordsINR } from "../util/receiptHelper.js"

// Lazy loader for PDF generation module to ensure seamless compatibility with test runners and runtime
const getPdfGenerator = async () => {
    const mod = await import("./certificatePdfService.js")
    return mod.generateDonationCertificatePdfBuffer
}

const getOrgInfo = () => ({
    name: "YOUTH UTIL WELFARE ASSOCIATION (YUWA India)",
    registeredUnder: "Registered Under Societies Registration Act XXI of 1860 & Section 80G / 12AA",
    registrationNo: "SOCIETY/WEST/ 2016/8902080",
    phones: ["+91 9450886855", "+91 7394886855"],
    website: "https://yuwaindia.org",
    email: "yuwaindia@gmail.com",
    headOffice: "H.No. RZC-13, KH. No. 72/23, 78/3, Nihal Vihar, Nangloi, New Delhi - 110041",
    branchOffice: "Behind Sankat Mochan Hanuman Mandir, Azad Nagar Colony East, Taramandal Road, Rustampur, Gorakhpur, Uttar Pradesh - 273001",
    delhiMapUrl: "https://www.google.com/maps/search/?api=1&query=Nihal+Vihar+Nangloi+New+Delhi+110041",
    gorakhpurMapUrl: "https://www.google.com/maps/search/?api=1&query=Behind+Sankat+Mochan+Hanuman+Mandir+Azad+Nagar+Colony+East+Taramandal+Road+Rustampur+Gorakhpur+Uttar+Pradesh+273001"
})

const getAdminEmail = () => process.env.ADMIN_NOTIFICATION_EMAIL || "yuwaindia@gmail.com"

/**
 * Universal responsive email template wrapper strictly aligned with YUWA India website branding
 */
const emailLayout = (title, content) => {
    const org = getOrgInfo()
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }
    table { border-collapse: collapse; }
    .email-wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 24px 12px;
    }
    .email-container {
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0, 113, 93, 0.06);
    }
    .brand-header {
      background: linear-gradient(135deg, #00715D 0%, #005a4a 100%);
      color: #ffffff;
      padding: 30px 24px 24px 24px;
      text-align: center;
      border-bottom: 3px solid #F7941D;
    }
    .brand-header h1 {
      margin: 0 0 6px 0;
      font-size: 23px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #ffffff;
    }
    .brand-header p {
      margin: 0;
      font-size: 13px;
      color: #fef08a;
      font-weight: 500;
      letter-spacing: 0.2px;
    }
    .badge-bar {
      background-color: #004d3f;
      padding: 9px 16px;
      text-align: center;
      font-size: 11px;
      color: #e2e8f0;
      font-weight: 500;
      letter-spacing: 0.3px;
    }
    .content-body {
      padding: 32px 26px;
    }
    .attachment-card {
      background-color: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 22px 0;
      display: flex;
      align-items: center;
    }
    .tax-card {
      background-color: #fefce8;
      border-left: 4px solid #F7941D;
      padding: 15px 18px;
      border-radius: 8px;
      margin: 22px 0;
      font-size: 13px;
      color: #78350f;
      line-height: 1.55;
    }
    .receipt-table {
      width: 100%;
      margin: 20px 0;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .receipt-table td {
      padding: 12px 18px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13.5px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .receipt-table tr:last-child td { border-bottom: none; }
    .receipt-table td.label {
      width: 38%;
      color: #475569;
      font-weight: 600;
    }
    .receipt-table td.value {
      color: #0f172a;
      font-weight: 500;
    }
    .message-card {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #00715D;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 18px 0;
      font-size: 14px;
      line-height: 1.65;
      color: #1e293b;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
    .office-card {
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 18px 20px;
      margin: 16px 0;
    }
    .map-btn {
      display: inline-block;
      padding: 8px 16px;
      background-color: #00715D;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 26px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      line-height: 1.6;
    }
    .footer a {
      color: #00715D;
      text-decoration: none;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-container { border-radius: 8px !important; width: 100% !important; }
      .brand-header { padding: 22px 16px !important; }
      .brand-header h1 { font-size: 20px !important; }
      .content-body { padding: 20px 16px !important; }
      .receipt-table td { padding: 10px 12px !important; font-size: 12.5px !important; }
      .receipt-table td.label { width: 42% !important; }
      .message-card { padding: 14px 14px !important; font-size: 13px !important; }
      .office-card { padding: 14px 14px !important; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="brand-header">
        <h1>YUWA INDIA</h1>
        <p>Youth Util Welfare Association</p>
      </div>
      <div class="badge-bar">
        Reg. No: ${org.registrationNo} &nbsp;|&nbsp; 80G Tax Exemption Verified
      </div>
      <div class="content-body">
        ${content}
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px 0; font-weight: 700; color: #1e293b; font-size: 13px;">Youth Util Welfare Association (YUWA India)</p>
        <p style="margin: 0 0 4px 0;"><strong>Head Office:</strong> ${org.headOffice}</p>
        <p style="margin: 0 0 8px 0;"><strong>Branch Office:</strong> ${org.branchOffice}</p>
        <p style="margin: 0;">Phone: ${org.phones.join(" / ")} &nbsp;|&nbsp; Email: <a href="mailto:${org.email}">${org.email}</a> &nbsp;|&nbsp; Web: <a href="${org.website}">${org.website.replace("https://", "")}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

/**
 * Send official donation receipt email to donor with 80G tax benefit details & attached PDF Certificate
 */
export const sendDonationReceiptEmail = async ({ donation, campaignTitle, receiptNumber, isOfflineVerified = false }) => {
    try {
        if (!donation || !donation.email) return

        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || donation.donorName || "Valued Supporter"
        const amount = Number(donation.amount || 0)
        const amountWords = numberToWordsINR(amount)
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`
        const finalReceiptNo = receiptNumber || donation.receiptNumber || `YUWA-${new Date().getFullYear()}-${donation.id.slice(-6).toUpperCase()}`
        const paymentMode = isOfflineVerified || donation.paymentMethod === "offline" ? "Offline Contribution (Verified & Confirmed)" : "Online Payment (Razorpay)"
        const donationDate = donation.createdAt ? new Date(donation.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN")
        const campaign = campaignTitle || "General Welfare Fund"
        const panDisplay = donation.pan && donation.pan.trim() && donation.pan !== "-" ? donation.pan.toUpperCase() : "<em>Not Provided</em>"
        const pdfFileName = `YUWA-India-Donation-Receipt-${finalReceiptNo}.pdf`

        // Generate the PDF certificate attachment Buffer directly
        let pdfAttachment = null
        try {
            const generatePdf = await getPdfGenerator()
            const pdfBuffer = await generatePdf({
                donation,
                campaignTitle: campaign,
                receiptNumber: finalReceiptNo
            })
            pdfAttachment = {
                filename: pdfFileName,
                content: pdfBuffer,
                contentType: "application/pdf"
            }
        } catch (pdfErr) {
            logError("[EmailService] Error generating PDF certificate attachment:", pdfErr)
        }

        const content = `
          <h2 style="color: #00715D; margin-top: 0; font-size: 21px; font-weight: 700;">Thank You for Your Generous Contribution!</h2>
          <p>Dear <strong>${donorName}</strong>,</p>
          <p>We gratefully acknowledge receipt of your donation of <strong style="color: #00715D; font-size: 16px;">${formattedAmount}</strong> towards <strong>${campaign}</strong>. Your compassion empowers YUWA India to continue transforming lives through education, child welfare, healthcare, and humanitarian initiatives.</p>

          <!-- PDF Certificate Attachment Banner -->
          <div class="attachment-card">
            <div style="font-size: 28px; margin-right: 14px;">📎</div>
            <div>
              <strong style="color: #065f46; font-size: 14px; display: block; margin-bottom: 2px;">Official 80G Tax Exemption Certificate Attached</strong>
              <span style="color: #047857; font-size: 12.5px;">Your digitally signed PDF certificate (<code>${pdfFileName}</code>) is attached to this email. You can directly download, print, or save it for your Income Tax deduction (Section 80G).</span>
            </div>
          </div>

          <table class="receipt-table">
            <tr>
              <td class="label">Official Receipt Number:</td>
              <td class="value"><strong style="color: #00715D; font-size: 14.5px;">${finalReceiptNo}</strong></td>
            </tr>
            <tr>
              <td class="label">Donation Amount:</td>
              <td class="value"><strong style="color: #00715D;">${formattedAmount}</strong> (${amountWords})</td>
            </tr>
            <tr>
              <td class="label">Date of Receipt:</td>
              <td class="value">${donationDate}</td>
            </tr>
            <tr>
              <td class="label">Payment Mode:</td>
              <td class="value">${paymentMode}</td>
            </tr>
            <tr>
              <td class="label">Cause / Campaign:</td>
              <td class="value">${campaign}</td>
            </tr>
            <tr>
              <td class="label">Donor PAN (Tax ID):</td>
              <td class="value">${panDisplay}</td>
            </tr>
            <tr>
              <td class="label">Transaction Reference:</td>
              <td class="value"><code style="font-size: 12px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${donation.razorpayId || donation.orderId || donation.id}</code></td>
            </tr>
          </table>

          <div class="tax-card">
            <strong style="font-size: 13.5px;">✓ Statutory Tax Benefit (Section 80G):</strong><br>
            Donations to Youth Util Welfare Association (YUWA India) are eligible for tax deduction under <strong>Section 80G(5)(vi)</strong> of the Income Tax Act, 1961 (Registration No: <code>SOCIETY/WEST/ 2016/8902080</code>). Please preserve the attached PDF certificate for filing your income tax returns.
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">If you have any questions or require an updated copy of your certificate, please reply directly to this email or reach us at <a href="mailto:yuwaindia@gmail.com" style="color: #00715D; font-weight: 600;">yuwaindia@gmail.com</a>.</p>
        `

        const html = emailLayout(`Donation Receipt #${finalReceiptNo}`, content)
        const subject = `Official 80G Donation Receipt #${finalReceiptNo} - YUWA India`
        const attachments = pdfAttachment ? [pdfAttachment] : []

        await sendMail(donation.email, subject, html, attachments)
        logInfo(`[EmailService] Donation receipt and PDF certificate sent successfully to ${donation.email} (${finalReceiptNo})`)
    } catch (error) {
        logError("[EmailService] Error sending donation receipt email", error)
    }
}

/**
 * Send admin alert when a new donation is successfully paid
 */
export const sendAdminDonationAlert = async ({ donation, campaignTitle, receiptNumber }) => {
    try {
        const adminEmail = getAdminEmail()
        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || donation.donorName || "Valued Supporter"
        const amount = Number(donation.amount || 0)
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`
        const finalReceiptNo = receiptNumber || donation.receiptNumber || donation.id
        const campaign = campaignTitle || "General Welfare Fund"

        const content = `
          <h2 style="color: #00715D; margin-top: 0; font-size: 19px; font-weight: 700;">New Donation Received!</h2>
          <p>A new donation of <strong style="color: #00715D; font-size: 16px;">${formattedAmount}</strong> has been successfully captured on the portal.</p>

          <table class="receipt-table">
            <tr><td class="label">Donor Name:</td><td class="value"><strong>${donorName}</strong></td></tr>
            <tr><td class="label">Email:</td><td class="value"><a href="mailto:${donation.email || ''}">${donation.email || "N/A"}</a></td></tr>
            <tr><td class="label">Phone:</td><td class="value"><a href="tel:${donation.phone || ''}">${donation.phone || "N/A"}</a></td></tr>
            <tr><td class="label">Address:</td><td class="value">${donation.address || "N/A"}</td></tr>
            <tr><td class="label">PAN:</td><td class="value">${donation.pan || "N/A"}</td></tr>
            <tr><td class="label">Amount:</td><td class="value"><strong style="color: #00715D;">${formattedAmount}</strong></td></tr>
            <tr><td class="label">Receipt Number:</td><td class="value"><strong style="color: #00715D;">${finalReceiptNo}</strong></td></tr>
            <tr><td class="label">Campaign:</td><td class="value">${campaign}</td></tr>
            <tr><td class="label">Payment Mode:</td><td class="value">${(donation.paymentMethod || "online").toUpperCase()}</td></tr>
            <tr><td class="label">Reference ID:</td><td class="value"><code>${donation.razorpayId || donation.orderId || donation.id}</code></td></tr>
            ${donation.message ? `<tr><td class="label">Donor Message:</td><td class="value"><div class="message-card" style="margin: 0;">${donation.message}</div></td></tr>` : ""}
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="https://yuwaindia.org/admin/donations" class="map-btn" style="padding: 12px 24px; font-size: 13px; background-color: #00715D;" target="_blank">View in Admin Portal</a>
          </div>
        `

        const html = emailLayout(`New Donation Alert: ${formattedAmount}`, content)
        const subject = `[New Donation Alert] ${formattedAmount} from ${donorName}`

        await sendMail(adminEmail, subject, html)
        logInfo(`[EmailService] Admin donation alert sent to ${adminEmail}`)
    } catch (error) {
        logError("[EmailService] Error sending admin donation alert", error)
    }
}

/**
 * Send offline donation pledge acknowledgement to donor with office details, map locations, contacts, and bank transfer info
 */
export const sendOfflinePledgeConfirmationEmail = async ({ donation, campaignTitle }) => {
    try {
        if (!donation || !donation.email) return

        const org = getOrgInfo()
        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || donation.donorName || "Valued Supporter"
        const amount = Number(donation.amount || 0)
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`
        const pledgeRef = donation.id.slice(-8).toUpperCase()
        const campaign = campaignTitle || "General Welfare Fund"

        const content = `
          <h2 style="color: #00715D; margin-top: 0; font-size: 21px; font-weight: 700;">Offline Donation Pledge Received</h2>
          <p>Dear <strong>${donorName}</strong>,</p>
          <p>Thank you for pledging a contribution of <strong style="color: #00715D; font-size: 16px;">${formattedAmount}</strong> towards <strong>${campaign}</strong>.</p>

          <table class="receipt-table">
            <tr><td class="label">Pledge Reference:</td><td class="value"><strong style="color: #00715D; font-size: 14px;">#${pledgeRef}</strong></td></tr>
            <tr><td class="label">Pledged Amount:</td><td class="value"><strong style="color: #00715D;">${formattedAmount}</strong></td></tr>
            <tr><td class="label">Campaign:</td><td class="value">${campaign}</td></tr>
            <tr><td class="label">Current Status:</td><td class="value"><span style="color: #d97706; font-weight: 700; background: #fef3c7; padding: 2px 8px; border-radius: 4px;">Pending Verification</span></td></tr>
          </table>

          <!-- Bank & UPI Transfer Details -->
          <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
            <strong style="color: #065f46; font-size: 14px; display: block; margin-bottom: 8px;">💳 Bank Transfer & UPI Instructions:</strong>
            <table style="width: 100%; font-size: 13px; color: #1e293b;">
              <tr><td style="padding: 3px 0; font-weight: 600; width: 35%;">Bank Name:</td><td>ICICI Bank</td></tr>
              <tr><td style="padding: 3px 0; font-weight: 600;">Account Name:</td><td>YOUTH UTIL WELFARE ASSOCIATION</td></tr>
              <tr><td style="padding: 3px 0; font-weight: 600;">Account Number:</td><td><code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #00715D;">061401004928</code></td></tr>
              <tr><td style="padding: 3px 0; font-weight: 600;">IFSC Code:</td><td><code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">ICIC0000614</code></td></tr>
              <tr><td style="padding: 3px 0; font-weight: 600;">UPI ID:</td><td><code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #00715D;">yuwaindia@icici</code></td></tr>
            </table>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #047857;"><em>Please quote your Pledge Reference <strong>#${pledgeRef}</strong> in the transfer remarks or send a screenshot to our WhatsApp / Email.</em></p>
          </div>

          <!-- Physical Office Locations & Google Maps -->
          <h3 style="color: #00715D; font-size: 16px; margin: 24px 0 10px 0;">🏢 Our Office Locations & Visiting Details:</h3>
          <p style="font-size: 13px; color: #475569; margin: 0 0 12px 0;">You may also visit our offices in person to deposit Cheque, Draft, or Cash contributions (Visiting Hours: Mon – Sat, 10:00 AM – 6:00 PM IST):</p>

          <div class="office-card">
            <strong style="color: #00715D; font-size: 14px; display: block; margin-bottom: 4px;">📍 Head Office (New Delhi)</strong>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;">${org.headOffice}</p>
            <p style="margin: 0 0 8px 0; font-size: 12.5px; color: #64748b;">Phone: <strong>+91 9450886855, +91 7394886855</strong></p>
            <a href="${org.delhiMapUrl}" class="map-btn" target="_blank">🗺️ Open New Delhi Office on Google Maps</a>
          </div>

          <div class="office-card">
            <strong style="color: #00715D; font-size: 14px; display: block; margin-bottom: 4px;">📍 Branch Office (Gorakhpur, U.P.)</strong>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;">${org.branchOffice}</p>
            <p style="margin: 0 0 8px 0; font-size: 12.5px; color: #64748b;">Phone: <strong>+91 9450886855, +91 7394886855</strong></p>
            <a href="${org.gorakhpurMapUrl}" class="map-btn" target="_blank">🗺️ Open Gorakhpur Office on Google Maps</a>
          </div>

          <div class="tax-card">
            <strong style="font-size: 13.5px;">✓ Instant 80G Certificate Upon Verification:</strong><br>
            As soon as our administrative team receives and verifies your contribution, an <strong>official Section 80G Tax Exemption Certificate PDF</strong> with a unique receipt number will be emailed to your inbox instantly.
          </div>
        `

        const html = emailLayout(`Offline Donation Pledge - #${pledgeRef}`, content)
        const subject = `Donation Pledge Received #${pledgeRef} - YUWA India`

        await sendMail(donation.email, subject, html)
        logInfo(`[EmailService] Offline pledge confirmation sent to ${donation.email}`)
    } catch (error) {
        logError("[EmailService] Error sending offline pledge confirmation", error)
    }
}

/**
 * Send admin alert when an offline donation pledge is submitted
 */
export const sendAdminPledgeAlert = async ({ donation, campaignTitle }) => {
    try {
        const adminEmail = getAdminEmail()
        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || donation.donorName || "Valued Supporter"
        const amount = Number(donation.amount || 0)
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`
        const pledgeRef = donation.id.slice(-8).toUpperCase()
        const campaign = campaignTitle || "General Welfare Fund"

        const content = `
          <h2 style="color: #00715D; margin-top: 0; font-size: 19px; font-weight: 700;">New Offline Donation Pledge!</h2>
          <p>A new offline donation pledge has been submitted and is waiting for your payment verification.</p>

          <table class="receipt-table">
            <tr><td class="label">Pledge Reference:</td><td class="value"><strong style="color: #00715D;">#${pledgeRef}</strong></td></tr>
            <tr><td class="label">Donor Name:</td><td class="value"><strong>${donorName}</strong></td></tr>
            <tr><td class="label">Email:</td><td class="value"><a href="mailto:${donation.email || ''}">${donation.email || "N/A"}</a></td></tr>
            <tr><td class="label">Phone:</td><td class="value"><a href="tel:${donation.phone || ''}">${donation.phone || "N/A"}</a></td></tr>
            <tr><td class="label">Address:</td><td class="value">${donation.address || "N/A"}</td></tr>
            <tr><td class="label">PAN:</td><td class="value">${donation.pan || "N/A"}</td></tr>
            <tr><td class="label">Amount Pledged:</td><td class="value"><strong style="color: #00715D;">${formattedAmount}</strong></td></tr>
            <tr><td class="label">Campaign:</td><td class="value">${campaign}</td></tr>
            ${donation.message ? `<tr><td class="label">Donor Notes:</td><td class="value"><div class="message-card" style="margin: 0;">${donation.message}</div></td></tr>` : ""}
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="https://yuwaindia.org/admin/donations" class="map-btn" style="padding: 12px 24px; font-size: 13px; background-color: #00715D;" target="_blank">Verify in Admin Portal</a>
          </div>
        `

        const html = emailLayout(`New Offline Pledge Alert: ${formattedAmount}`, content)
        const subject = `[Offline Pledge Alert] ${formattedAmount} from ${donorName}`

        await sendMail(adminEmail, subject, html)
        logInfo(`[EmailService] Admin pledge alert sent to ${adminEmail}`)
    } catch (error) {
        logError("[EmailService] Error sending admin pledge alert", error)
    }
}

/**
 * Send user acknowledgement & admin notification for Contact Us queries
 * Large multi-paragraph messages are formatted in a fully responsive, clean message card
 */
export const sendContactFormEmails = async ({ name, email, phone, message }) => {
    try {
        const adminEmail = getAdminEmail()
        const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })

        // 1. User Acknowledgement
        if (email) {
            const userContent = `
              <h2 style="color: #00715D; margin-top: 0; font-size: 21px; font-weight: 700;">Thank You for Contacting YUWA India</h2>
              <p>Dear <strong>${name}</strong>,</p>
              <p>Thank you for reaching out to Youth Util Welfare Association. We have successfully received your inquiry and our team will get back to you within 24 to 48 business hours.</p>

              <div class="message-card">
                <strong style="color: #00715D; display: block; margin-bottom: 6px; font-size: 13px;">Your Submitted Query:</strong>
                <div>${message}</div>
              </div>

              <p style="font-size: 13px; color: #475569;">If your matter requires immediate assistance, please feel free to call our representatives directly at <strong>+91 9450886855</strong> or <strong>+91 7394886855</strong>.</p>
            `
            const userHtml = emailLayout("We Received Your Message", userContent)
            await sendMail(email, "We Received Your Message - YUWA India", userHtml)
        }

        // 2. Admin Alert (Handles large messages gracefully with word-break & pre-wrap)
        const adminContent = `
          <h2 style="color: #00715D; margin-top: 0; font-size: 19px; font-weight: 700;">New Contact Inquiry Received</h2>
          <p>A website visitor has submitted a new inquiry. Details are provided below:</p>

          <table class="receipt-table">
            <tr><td class="label">Visitor Name:</td><td class="value"><strong>${name}</strong></td></tr>
            <tr><td class="label">Email Address:</td><td class="value"><a href="mailto:${email}" style="color: #00715D; font-weight: 600;">${email}</a></td></tr>
            <tr><td class="label">Phone Number:</td><td class="value"><a href="tel:${phone}" style="color: #00715D;">${phone || "Not Provided"}</a></td></tr>
            <tr><td class="label">Date & Time:</td><td class="value">${formattedDate} IST</td></tr>
          </table>

          <h3 style="color: #00715D; font-size: 15px; margin: 20px 0 8px 0;">Inquiry Message:</h3>
          <div class="message-card">
            ${message}
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="mailto:${email}?subject=Re:%20Inquiry%20regarding%20YUWA%20India" class="map-btn" style="padding: 10px 20px; font-size: 13px; background-color: #00715D;">✉️ Reply Directly to ${name}</a>
          </div>
        `
        const adminHtml = emailLayout("New Website Inquiry", adminContent)
        await sendMail(adminEmail, `[New Inquiry] Message from ${name}`, adminHtml)
        logInfo(`[EmailService] Contact form emails processed for ${email}`)
    } catch (error) {
        logError("[EmailService] Error processing contact form emails", error)
    }
}

/**
 * Send applicant welcome & admin notification for Volunteer applications
 */
export const sendVolunteerFormEmails = async ({ firstName, lastName, email, phone, occupation, message }) => {
    try {
        const adminEmail = getAdminEmail()
        const fullName = [firstName, lastName].filter(Boolean).join(" ")
        const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })

        // 1. Volunteer Welcome
        if (email) {
            const userContent = `
              <h2 style="color: #00715D; margin-top: 0; font-size: 21px; font-weight: 700;">Welcome to the YUWA India Volunteer Network!</h2>
              <p>Dear <strong>${fullName}</strong>,</p>
              <p>Thank you for stepping forward to make a meaningful difference! Your passion and readiness to serve will positively touch the lives of countless children and families in need.</p>
              <p>Our volunteer coordination desk is reviewing your application and will contact you shortly regarding upcoming field initiatives, drives, and orientation schedules.</p>

              <div class="message-card">
                <strong style="color: #00715D; display: block; margin-bottom: 6px;">Your Application Summary:</strong>
                <div><strong>Occupation:</strong> ${occupation || "Volunteer"}</div>
                <div><strong>Contact Phone:</strong> ${phone}</div>
                ${message ? `<div style="margin-top: 6px;"><strong>Motivation Note:</strong><br>${message}</div>` : ""}
              </div>

              <p style="font-size: 13px; color: #475569;">Together, we create lasting change. Thank you for joining hands with YUWA India.</p>
            `
            const userHtml = emailLayout("Welcome to YUWA India Volunteers", userContent)
            await sendMail(email, "Welcome to YUWA India Volunteer Community!", userHtml)
        }

        // 2. Admin Alert
        const adminContent = `
          <h2 style="color: #00715D; margin-top: 0; font-size: 19px; font-weight: 700;">New Volunteer Application!</h2>
          <table class="receipt-table">
            <tr><td class="label">Applicant Name:</td><td class="value"><strong>${fullName}</strong></td></tr>
            <tr><td class="label">Email:</td><td class="value"><a href="mailto:${email}" style="color: #00715D;">${email}</a></td></tr>
            <tr><td class="label">Phone:</td><td class="value"><a href="tel:${phone}" style="color: #00715D;">${phone}</a></td></tr>
            <tr><td class="label">Occupation:</td><td class="value">${occupation || "N/A"}</td></tr>
            <tr><td class="label">Submission Time:</td><td class="value">${formattedDate} IST</td></tr>
          </table>

          <h3 style="color: #00715D; font-size: 15px; margin: 18px 0 8px 0;">Applicant Motivation / Message:</h3>
          <div class="message-card">
            ${message || "No additional message provided."}
          </div>
        `
        const adminHtml = emailLayout("New Volunteer Application", adminContent)
        await sendMail(adminEmail, `[Volunteer Application] ${fullName} (${occupation || "Volunteer"})`, adminHtml)
        logInfo(`[EmailService] Volunteer form emails processed for ${email}`)
    } catch (error) {
        logError("[EmailService] Error processing volunteer form emails", error)
    }
}

/**
 * Send welcome email for newsletter subscribers
 */
export const sendNewsletterWelcomeEmail = async (email) => {
    try {
        if (!email) return
        const content = `
          <h2 style="color: #00715D; margin-top: 0; font-size: 21px; font-weight: 700;">Welcome to the YUWA India Community!</h2>
          <p>Thank you for subscribing to our newsletter! You are now part of an inspiring community dedicated to uplifting education, healthcare, and social welfare for underserved communities across India.</p>
          <p>You will receive our regular updates showcasing active on-ground campaigns, impactful beneficiary stories, and upcoming social drives.</p>
          <div style="margin-top: 24px; text-align: center;">
            <a href="https://yuwaindia.org" class="map-btn" style="padding: 10px 24px; font-size: 13px;" target="_blank">Visit Our Website</a>
          </div>
        `
        const html = emailLayout("Welcome to YUWA India Newsletter", content)
        await sendMail(email, "Welcome to YUWA India Newsletter Community!", html)
        logInfo(`[EmailService] Newsletter welcome sent to ${email}`)
    } catch (error) {
        logError("[EmailService] Error sending newsletter welcome email", error)
    }
}

/**
 * Send email notifications for Internship Application (Applicant acknowledgement & Admin alert)
 */
export const sendInternshipApplicationEmails = async (application) => {
    try {
        const adminEmail = getAdminEmail()
        const formattedDate = new Date(application.createdAt || Date.now()).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata"
        })

        // 1. Applicant Confirmation Email
        if (application.email) {
            const userContent = `
              <h2 style="color: #00715D; margin-top: 0; font-size: 21px; font-weight: 700;">Internship Application Received!</h2>
              <p>Dear <strong>${application.fullName}</strong>,</p>
              <p>Thank you for applying for the <strong>${application.domain}</strong> internship at YUWA India. We have received your application successfully.</p>
              
              <div class="message-card" style="margin: 18px 0; border-left: 4px solid #00715D; background-color: #f8fafc; padding: 14px 18px;">
                <strong style="color: #00715D; display: block; font-size: 15px; margin-bottom: 8px;">Application Summary:</strong>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Application No:</td><td style="padding: 4px 0; font-weight: 700; color: #00715D;">${application.applicationNumber}</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748b;">Domain / Role:</td><td style="padding: 4px 0; font-weight: 600;">${application.domain}</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748b;">College / University:</td><td style="padding: 4px 0;">${application.college}</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748b;">Course & Year:</td><td style="padding: 4px 0;">${application.course} (${application.yearOfStudy})</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748b;">Preferred Duration:</td><td style="padding: 4px 0;">${application.duration} (${application.mode})</td></tr>
                </table>
              </div>

              <p>Our talent acquisition and mentoring team is reviewing your profile and resume. If your profile matches our requirements, we will reach out to you via email or phone for an introductory interaction.</p>
              <p style="font-size: 13px; color: #475569;">Best wishes for your career journey!<br><strong>Team YUWA India</strong></p>
            `
            const userHtml = emailLayout("Internship Application Received", userContent)
            await sendMail(application.email, `Application Received: ${application.domain} Internship (${application.applicationNumber})`, userHtml)
            logInfo(`[EmailService] Internship application acknowledgment sent to ${application.email}`)
        }

        // 2. Admin Alert Email
        if (adminEmail) {
            const adminContent = `
              <h2 style="color: #00715D; margin-top: 0; font-size: 19px; font-weight: 700;">New Student Internship Application!</h2>
              <table class="receipt-table">
                <tr><td class="label">Application No:</td><td class="value"><strong style="color: #00715D;">${application.applicationNumber}</strong></td></tr>
                <tr><td class="label">Candidate Name:</td><td class="value"><strong>${application.fullName}</strong></td></tr>
                <tr><td class="label">Domain Applied:</td><td class="value"><strong style="color: #00715D;">${application.domain}</strong></td></tr>
                <tr><td class="label">Email:</td><td class="value"><a href="mailto:${application.email}" style="color: #00715D;">${application.email}</a></td></tr>
                <tr><td class="label">Mobile Phone:</td><td class="value"><a href="tel:${application.phone}" style="color: #00715D;">${application.phone}</a></td></tr>
                <tr><td class="label">College / University:</td><td class="value">${application.college}</td></tr>
                <tr><td class="label">Course & Passing:</td><td class="value">${application.course} (${application.yearOfStudy}, Passing: ${application.passingYear})</td></tr>
                <tr><td class="label">Academic Scores:</td><td class="value">10th: ${application.tenthPercentage ?? "N/A"}% | 12th: ${application.twelfthPercentage ?? "N/A"}% | CGPA: ${application.currentCgpa ?? "N/A"}</td></tr>
                <tr><td class="label">Location:</td><td class="value">${application.city}, ${application.state} - ${application.pincode}</td></tr>
                <tr><td class="label">Duration & Mode:</td><td class="value">${application.duration} (${application.mode})</td></tr>
                <tr><td class="label">Submission Date:</td><td class="value">${formattedDate} IST</td></tr>
              </table>

              ${application.whyJoin ? `
                <h3 style="color: #00715D; font-size: 14px; margin: 16px 0 6px 0;">Statement / Why Join Yuwa:</h3>
                <div class="message-card" style="font-size: 13px; line-height: 1.5;">${application.whyJoin}</div>
              ` : ""}

              <div style="margin-top: 24px; text-align: center; display: flex; gap: 12px; justify-content: center;">
                ${application.resumeUrl ? `<a href="${application.resumeUrl}" class="map-btn" style="background-color: #00715D; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;" target="_blank">📄 View Candidate Resume</a>` : ""}
                <a href="https://yuwaindia.org/admin/career" class="map-btn" style="background-color: #1e293b; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;" target="_blank">Open Admin Portal</a>
              </div>
            `
            const adminHtml = emailLayout("New Internship Application", adminContent)
            await sendMail(adminEmail, `[New Internship] ${application.fullName} - ${application.domain} (${application.college})`, adminHtml)
            logInfo(`[EmailService] Internship application admin alert sent to ${adminEmail}`)
        }
    } catch (error) {
        logError("[EmailService] Error processing internship application emails", error)
    }
}

/**
 * Send candidate email notification on application status update
 */
export const sendApplicationStatusUpdateEmail = async (application, newStatus, adminRemarks = "") => {
    try {
        if (!application || !application.email) return

        const statusUpper = (newStatus || "").toUpperCase()
        let subject = ""
        let statusTitle = ""
        let badgeColor = "#00715D"
        let statusMessage = ""

        switch (statusUpper) {
            case "REVIEWING":
                subject = `Application Under Review: ${application.domain} Internship (${application.applicationNumber})`
                statusTitle = "Application Under Review"
                badgeColor = "#d97706" // Amber
                statusMessage = "We are pleased to inform you that your internship application is currently under active review by our academic and mentoring team. We are evaluating your background and skills for the chosen domain."
                break
            case "SHORTLISTED":
                subject = `Congratulations! You are Shortlisted for ${application.domain} Internship (${application.applicationNumber})`
                statusTitle = "Application Shortlisted!"
                badgeColor = "#2563eb" // Blue
                statusMessage = "Congratulations! Your profile has been shortlisted for the next stage of our selection process. Our program coordinator will reach out to you shortly via phone or email for an introductory technical discussion."
                break
            case "INTERVIEWED":
                subject = `Interview Completed: ${application.domain} Internship (${application.applicationNumber})`
                statusTitle = "Interview Completed"
                badgeColor = "#7c3aed" // Purple
                statusMessage = "Thank you for participating in the interview interaction with our team. Your responses have been documented and are under final evaluation. We will notify you of the outcome soon."
                break
            case "SELECTED":
                subject = `Congratulations! You are Selected for ${application.domain} Internship at YUWA India (${application.applicationNumber})`
                statusTitle = "Congratulations! You are Selected"
                badgeColor = "#059669" // Emerald green
                statusMessage = "We are thrilled to extend an offer for you to join the YUWA India Internship Program! Welcome to our changemaker community. You will receive an official onboarding kit and commencement schedule shortly."
                break
            case "REJECTED":
                subject = `Update on Your Internship Application (${application.applicationNumber})`
                statusTitle = "Application Status Update"
                badgeColor = "#dc2626" // Red
                statusMessage = "Thank you for taking the time to apply for an internship with YUWA India. Due to a very high volume of applications and limited seats for this cohort, we are unable to offer you an internship position at this time. We sincerely appreciate your interest and encourage you to apply for future opportunities."
                break
            default:
                subject = `Status Update on Your Internship Application (${application.applicationNumber})`
                statusTitle = `Status Updated: ${newStatus}`
                badgeColor = "#00715D"
                statusMessage = `Your internship application status has been updated to "${newStatus}".`
        }

        const candidateContent = `
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background-color: ${badgeColor}; color: #ffffff; padding: 6px 18px; border-radius: 20px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase;">
              ${statusTitle}
            </span>
          </div>

          <p>Dear <strong>${application.fullName}</strong>,</p>
          <p>${statusMessage}</p>

          <div class="message-card" style="margin: 20px 0; border-left: 4px solid ${badgeColor}; background-color: #f8fafc; padding: 14px 18px;">
            <strong style="color: #00715D; display: block; font-size: 14px; margin-bottom: 8px;">Application Information:</strong>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Application No:</td><td style="padding: 4px 0; font-weight: 700; color: #00715D;">${application.applicationNumber}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Domain:</td><td style="padding: 4px 0; font-weight: 600;">${application.domain}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">University / College:</td><td style="padding: 4px 0;">${application.college}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Current Status:</td><td style="padding: 4px 0; font-weight: 700; color: ${badgeColor};">${statusUpper}</td></tr>
            </table>
          </div>

          ${adminRemarks && adminRemarks.trim() ? `
            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
              <strong style="color: #854d0e; font-size: 13px; display: block; margin-bottom: 4px;">Note from Admissions / Mentors:</strong>
              <p style="margin: 0; font-size: 13px; color: #713f12; line-height: 1.5;">${adminRemarks.trim()}</p>
            </div>
          ` : ""}

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">If you have any questions regarding your application, feel free to reply directly to this email or reach our office helpline at <strong>+91 9450886855</strong>.</p>
          <p style="font-size: 13px; color: #475569;">Warm regards,<br><strong>YUWA India Internship & Talent Team</strong></p>
        `

        const html = emailLayout(statusTitle, candidateContent)
        await sendMail(application.email, subject, html)
        logInfo(`[EmailService] Status update email (${statusUpper}) sent successfully to ${application.email}`)
    } catch (error) {
        logError("[EmailService] Error sending application status update email", error)
    }
}


