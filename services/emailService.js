import sendMail from "../util/mailSender.js"
import { logError, logInfo } from "../util/logHelper.js"
import { numberToWordsINR } from "../util/receiptHelper.js"

const getOrgInfo = () => ({
    name: "YOUTH UTIL WELFARE ASSOCIATION (YUWA India)",
    registeredUnder: "Registered Under 12AA / 80G",
    registrationNo: "SOCIETY/WEST/ 2016/8902080",
    phones: ["9450886855", "7394886855"],
    website: "https://yuwaindia.org",
    email: "yuwaindia@gmail.com",
    headOffice: "H.No. RZC-13, KH. No. 72/23, 78/3, Nihal Vihar, Nangloi, New Delhi-110041",
    branchOffice: "393i, Rajiv Nagar, West Basharatpur, Gorakhpur (U.P.)-273001"
})

const getAdminEmail = () => process.env.ADMIN_NOTIFICATION_EMAIL || "yuwaindia@gmail.com"

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
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2d3748; line-height: 1.6; }
    .email-container { max-width: 640px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #003366 0%, #004c99 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; letter-spacing: 0.5px; font-weight: 700; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; color: #facc15; font-weight: 500; }
    .badge-bar { background-color: #0f233a; padding: 8px 16px; text-align: center; font-size: 11px; color: #cbd5e1; }
    .body { padding: 32px 28px; }
    .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer a { color: #004c99; text-decoration: none; font-weight: 600; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-align: center; margin: 16px 0; }
    .receipt-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #fafbfc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .receipt-table td { padding: 12px 16px; border-bottom: 1px solid #edf2f7; font-size: 13px; }
    .receipt-table tr:last-child td { border-bottom: none; }
    .receipt-table td.label { font-weight: 600; color: #4a5568; width: 38%; }
    .receipt-table td.value { color: #1a202c; font-weight: 500; }
    .tax-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 12.5px; color: #065f46; }
    .note-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 12.5px; color: #1e40af; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>YUWA INDIA</h1>
      <p>Youth Util Welfare Association</p>
    </div>
    <div class="badge-bar">
      ${org.registeredUnder} &nbsp;|&nbsp; Reg No: ${org.registrationNo}
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Youth Util Welfare Association (YUWA India)</p>
      <p style="margin: 0 0 4px 0;">Head Office: ${org.headOffice}</p>
      <p style="margin: 0 0 10px 0;">Branch Office: ${org.branchOffice}</p>
      <p style="margin: 0;">Phone: ${org.phones.join(" / ")} &nbsp;|&nbsp; Email: <a href="mailto:${org.email}">${org.email}</a> &nbsp;|&nbsp; Website: <a href="${org.website}">${org.website.replace("https://", "")}</a></p>
    </div>
  </div>
</body>
</html>
`
}

/**
 * Send official donation receipt email to donor with 80G tax benefit details & certificate link
 */
export const sendDonationReceiptEmail = async ({ donation, campaignTitle, receiptNumber, isOfflineVerified = false }) => {
    try {
        if (!donation || !donation.email) return

        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || "Generous Supporter"
        const amount = Number(donation.amount || 0)
        const amountWords = numberToWordsINR(amount)
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`
        const finalReceiptNo = receiptNumber || donation.receiptNumber || `YUWA-${new Date().getFullYear()}-${donation.id.slice(-6).toUpperCase()}`
        const paymentMode = isOfflineVerified || donation.paymentMethod === "offline" ? "Offline (Verified & Confirmed)" : "Online (Razorpay)"
        const donationDate = donation.createdAt ? new Date(donation.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN")
        const campaign = campaignTitle || "General Welfare Fund"
        const certificateUrl = `https://yuwaindia.org/donate-us?receipt=${encodeURIComponent(finalReceiptNo)}`

        const content = `
          <h2 style="color: #003366; margin-top: 0; font-size: 20px;">Thank You for Your Generous Support!</h2>
          <p>Dear <strong>${donorName}</strong>,</p>
          <p>We gratefully acknowledge receipt of your generous contribution of <strong>${formattedAmount}</strong> towards <strong>${campaign}</strong>. Your compassion enables YUWA India to continue providing essential education, healthcare, and social welfare to children and underserved communities.</p>

          <table class="receipt-table">
            <tr>
              <td class="label">Official Receipt Number:</td>
              <td class="value"><strong style="color: #003366; font-size: 14px;">${finalReceiptNo}</strong></td>
            </tr>
            <tr>
              <td class="label">Donation Amount:</td>
              <td class="value"><strong>${formattedAmount}</strong> (${amountWords})</td>
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
              <td class="label">Campaign / Cause:</td>
              <td class="value">${campaign}</td>
            </tr>
            <tr>
              <td class="label">Donor PAN:</td>
              <td class="value">${donation.pan ? donation.pan.toUpperCase() : "<em>Not Provided</em>"}</td>
            </tr>
            <tr>
              <td class="label">Transaction Reference:</td>
              <td class="value">${donation.razorpayId || donation.orderId || donation.id}</td>
            </tr>
          </table>

          <div class="tax-box">
            <strong>✓ Tax Exemption Benefit (Section 80G):</strong><br>
            Donations to Youth Util Welfare Association (YUWA India) are eligible for tax deduction under Section 80G of the Income Tax Act, 1961. Please retain this receipt and your certificate for filing tax returns.
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${certificateUrl}" class="button" target="_blank">Download Official 80G Certificate</a>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">If you have any questions or require an updated copy of your receipt, please reply directly to this email or contact us at <a href="mailto:yuwaindia@gmail.com" style="color: #004c99;">yuwaindia@gmail.com</a>.</p>
        `

        const html = emailLayout(`Donation Receipt - ${finalReceiptNo}`, content)
        const subject = `Official 80G Donation Receipt #${finalReceiptNo} - YUWA India`

        await sendMail(donation.email, subject, html)
        logInfo(`[EmailService] Donation receipt sent successfully to ${donation.email} (${finalReceiptNo})`)
    } catch (error) {
        logError("[EmailService] Error sending donation receipt email", error)
        // Non-blocking: Do not re-throw error to avoid disrupting transaction
    }
}

/**
 * Send admin alert when a new donation is successfully paid
 */
export const sendAdminDonationAlert = async ({ donation, campaignTitle, receiptNumber }) => {
    try {
        const adminEmail = getAdminEmail()
        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || "Generous Supporter"
        const amount = Number(donation.amount || 0)
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`
        const finalReceiptNo = receiptNumber || donation.receiptNumber || donation.id
        const campaign = campaignTitle || "General Welfare Fund"

        const content = `
          <h2 style="color: #003366; margin-top: 0; font-size: 18px;">New Donation Received!</h2>
          <p>A new donation of <strong>${formattedAmount}</strong> has been successfully received on the portal.</p>

          <table class="receipt-table">
            <tr><td class="label">Donor Name:</td><td class="value">${donorName}</td></tr>
            <tr><td class="label">Email:</td><td class="value">${donation.email || "N/A"}</td></tr>
            <tr><td class="label">Phone:</td><td class="value">${donation.phone || "N/A"}</td></tr>
            <tr><td class="label">PAN:</td><td class="value">${donation.pan || "N/A"}</td></tr>
            <tr><td class="label">Amount:</td><td class="value"><strong>${formattedAmount}</strong></td></tr>
            <tr><td class="label">Receipt Number:</td><td class="value">${finalReceiptNo}</td></tr>
            <tr><td class="label">Campaign:</td><td class="value">${campaign}</td></tr>
            <tr><td class="label">Payment Mode:</td><td class="value">${donation.paymentMethod || "online"}</td></tr>
            <tr><td class="label">Reference:</td><td class="value">${donation.razorpayId || donation.orderId || donation.id}</td></tr>
            ${donation.message ? `<tr><td class="label">Donor Message:</td><td class="value">${donation.message}</td></tr>` : ""}
          </table>

          <div style="text-align: center; margin: 20px 0;">
            <a href="https://yuwaindia.org/admin/donations" class="button" target="_blank">View in Admin Portal</a>
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
 * Send offline donation pledge acknowledgement to donor with payment transfer instructions
 */
export const sendOfflinePledgeConfirmationEmail = async ({ donation, campaignTitle }) => {
    try {
        if (!donation || !donation.email) return

        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || "Valued Supporter"
        const amount = Number(donation.amount || 0)
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`
        const pledgeRef = donation.id.slice(-8).toUpperCase()
        const campaign = campaignTitle || "General Welfare Fund"

        const content = `
          <h2 style="color: #003366; margin-top: 0; font-size: 20px;">Offline Donation Pledge Received</h2>
          <p>Dear <strong>${donorName}</strong>,</p>
          <p>Thank you for pledging a contribution of <strong>${formattedAmount}</strong> towards <strong>${campaign}</strong>.</p>

          <table class="receipt-table">
            <tr><td class="label">Pledge Reference:</td><td class="value"><strong style="color: #003366;">#${pledgeRef}</strong></td></tr>
            <tr><td class="label">Pledged Amount:</td><td class="value"><strong>${formattedAmount}</strong></td></tr>
            <tr><td class="label">Campaign:</td><td class="value">${campaign}</td></tr>
            <tr><td class="label">Status:</td><td class="value"><span style="color: #d97706; font-weight: 700;">Pending Verification</span></td></tr>
          </table>

          <div class="note-box">
            <strong>How to Complete Your Donation:</strong><br>
            Please transfer the pledged amount via Bank Transfer (NEFT/RTGS/IMPS), UPI, Cheque, or Cash to:
            <ul style="margin: 8px 0 0 16px; padding: 0;">
              <li><strong>Organization Name:</strong> YOUTH UTIL WELFARE ASSOCIATION</li>
              <li><strong>Registration No:</strong> SOCIETY/WEST/ 2016/8902080</li>
              <li><strong>Contact Phones:</strong> 9450886855 / 7394886855</li>
              <li><strong>Official Email:</strong> yuwaindia@gmail.com</li>
            </ul>
            <p style="margin: 8px 0 0 0;"><em>Please quote your Pledge Reference <strong>#${pledgeRef}</strong> in the transfer remarks or send a screenshot to our WhatsApp/Email.</em></p>
          </div>

          <p>As soon as our administrative team verifies your contribution, an <strong>official 80G Tax Exemption Certificate</strong> with a unique receipt number will be emailed to you immediately.</p>
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
        const donorName = [donation.firstName, donation.lastName].filter(Boolean).join(" ") || "Valued Supporter"
        const amount = Number(donation.amount || 0)
        const formattedAmount = `₹${amount.toLocaleString("en-IN")}`
        const pledgeRef = donation.id.slice(-8).toUpperCase()
        const campaign = campaignTitle || "General Welfare Fund"

        const content = `
          <h2 style="color: #003366; margin-top: 0; font-size: 18px;">New Offline Donation Pledge!</h2>
          <p>A new offline donation pledge has been submitted and is waiting for your verification.</p>

          <table class="receipt-table">
            <tr><td class="label">Pledge Reference:</td><td class="value"><strong>#${pledgeRef}</strong></td></tr>
            <tr><td class="label">Donor Name:</td><td class="value">${donorName}</td></tr>
            <tr><td class="label">Email:</td><td class="value">${donation.email || "N/A"}</td></tr>
            <tr><td class="label">Phone:</td><td class="value">${donation.phone || "N/A"}</td></tr>
            <tr><td class="label">Address:</td><td class="value">${donation.address || "N/A"}</td></tr>
            <tr><td class="label">PAN:</td><td class="value">${donation.pan || "N/A"}</td></tr>
            <tr><td class="label">Amount Pledged:</td><td class="value"><strong>${formattedAmount}</strong></td></tr>
            <tr><td class="label">Campaign:</td><td class="value">${campaign}</td></tr>
            ${donation.message ? `<tr><td class="label">Donor Notes:</td><td class="value">${donation.message}</td></tr>` : ""}
          </table>

          <div style="text-align: center; margin: 20px 0;">
            <a href="https://yuwaindia.org/admin/donations" class="button" target="_blank">Verify in Admin Portal</a>
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
 */
export const sendContactFormEmails = async ({ name, email, phone, message }) => {
    try {
        const adminEmail = getAdminEmail()

        // 1. User Acknowledgement
        if (email) {
            const userContent = `
              <h2 style="color: #003366; margin-top: 0; font-size: 20px;">Thank You for Contacting YUWA India</h2>
              <p>Dear <strong>${name}</strong>,</p>
              <p>Thank you for reaching out to Youth Util Welfare Association. We have successfully received your message and our team will get back to you within 24 to 48 business hours.</p>

              <div class="note-box">
                <strong>Your Message Summary:</strong><br>
                <em>"${message}"</em>
              </div>

              <p>If your matter is urgent, please feel free to call our representatives directly at <strong>9450886855</strong> or <strong>7394886855</strong>.</p>
            `
            const userHtml = emailLayout("We Received Your Message", userContent)
            await sendMail(email, "We Received Your Message - YUWA India", userHtml)
        }

        // 2. Admin Alert
        const adminContent = `
          <h2 style="color: #003366; margin-top: 0; font-size: 18px;">New Contact Query Received</h2>
          <table class="receipt-table">
            <tr><td class="label">Name:</td><td class="value">${name}</td></tr>
            <tr><td class="label">Email:</td><td class="value"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td class="label">Phone:</td><td class="value"><a href="tel:${phone}">${phone}</a></td></tr>
            <tr><td class="label">Message:</td><td class="value">${message}</td></tr>
          </table>
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

        // 1. Volunteer Welcome
        if (email) {
            const userContent = `
              <h2 style="color: #003366; margin-top: 0; font-size: 20px;">Welcome to the YUWA India Volunteer Network!</h2>
              <p>Dear <strong>${fullName}</strong>,</p>
              <p>Thank you for stepping forward to make a difference! Your enthusiasm and readiness to serve will touch the lives of countless children and families in need.</p>
              <p>Our volunteer coordination team is reviewing your application details and will get in touch with you shortly to discuss upcoming field initiatives, drives, and orientation schedules.</p>

              <div class="note-box">
                <strong>Application Details:</strong><br>
                Occupation / Background: ${occupation || "Volunteer"}<br>
                Phone: ${phone}
              </div>

              <p>Together, we create lasting change. Thank you for being a part of our journey.</p>
            `
            const userHtml = emailLayout("Welcome to YUWA India Volunteers", userContent)
            await sendMail(email, "Welcome to YUWA India Volunteer Community!", userHtml)
        }

        // 2. Admin Alert
        const adminContent = `
          <h2 style="color: #003366; margin-top: 0; font-size: 18px;">New Volunteer Application!</h2>
          <table class="receipt-table">
            <tr><td class="label">Applicant Name:</td><td class="value"><strong>${fullName}</strong></td></tr>
            <tr><td class="label">Email:</td><td class="value"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td class="label">Phone:</td><td class="value"><a href="tel:${phone}">${phone}</a></td></tr>
            <tr><td class="label">Occupation:</td><td class="value">${occupation || "N/A"}</td></tr>
            <tr><td class="label">Motivation / Notes:</td><td class="value">${message}</td></tr>
          </table>
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
          <h2 style="color: #003366; margin-top: 0; font-size: 20px;">Welcome to the YUWA India Community!</h2>
          <p>Thank you for subscribing to our newsletter! You are now part of a dedicated community working toward uplifting education, healthcare, and welfare for underprivileged communities.</p>
          <p>You will receive our monthly updates detailing our active ground campaigns, success stories, and upcoming events.</p>
        `
        const html = emailLayout("Welcome to YUWA India Newsletter", content)
        await sendMail(email, "Welcome to YUWA India Newsletter Community!", html)
        logInfo(`[EmailService] Newsletter welcome sent to ${email}`)
    } catch (error) {
        logError("[EmailService] Error sending newsletter welcome email", error)
    }
}
