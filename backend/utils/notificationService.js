const axios = require("axios");
const nodemailer = require("nodemailer");

/**
 * Configure Gmail SMTP Transporter
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
        user: process.env.EMAIL_USER || "logisticsscannerofficials@gmail.com",
        pass: process.env.EMAIL_PASS || "hgltigcwgnzruasb"
    }
});

/**
 * Send WhatsApp OTP via Wabridge API
 * @param {Object} options - { mobile, otp }
 */
const sendWhatsAppOTP = async ({ mobile, otp }) => {
    try {
        // Clean mobile number (remove non-digits)
        let cleanMobile = mobile ? mobile.replace(/\D/g, "") : "";
        
        // If it's exactly 10 digits and doesn't start with '+', prepend India country code 91
        if (cleanMobile.length === 10 && !mobile.startsWith("+")) {
            cleanMobile = "91" + cleanMobile;
        }

        if (!cleanMobile) {
            console.error("[WhatsApp Service] Error: Invalid or missing mobile number");
            return { success: false, error: "Invalid mobile number" };
        }

        const payload = {
            "app-key": process.env.WABRIDGE_APP_KEY || "9f0df15d-1058-44b2-9beb-ff309449afa9",
            "auth-key": process.env.WABRIDGE_AUTH_KEY || "0ede54ddb11953c237dc825c4bdcd43e3ec41ce335a7d2591b",
            "device_id": process.env.WABRIDGE_DEVICE_ID || "6960a3783524dd5a0916b9d5",
            "destination_number": cleanMobile,
            "template_id": process.env.WABRIDGE_OTP_TEMPLATE_ID || "2114436642782977",
            "variables": [String(otp)],
            "button_variable": [],
            "media": "",
            "message": ""
        };

        const response = await axios.post("https://web.wabridge.com/api/createmessage", payload, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        console.log(`[WhatsApp Service] OTP template sent to ${cleanMobile}. Response:`, response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(
            "[WhatsApp Service] Error sending WhatsApp OTP via Wabridge:",
            error.response ? error.response.data : error.message
        );
        return { success: false, error: error.message };
    }
};

/**
 * Send Meeting Verification OTP via Email (Gmail SMTP)
 * @param {Object} options - { email, otp, clientName, meetingTitle }
 */
const sendEmailOTP = async ({ email, otp, clientName = "Client", meetingTitle = "Field Sales Meeting" }) => {
    if (!email) {
        return { success: false, error: "Missing recipient email" };
    }

    try {
        const mailOptions = {
            from: `"Office Management System" <${process.env.EMAIL_USER || "logisticsscannerofficials@gmail.com"}>`,
            to: email,
            subject: `Verification OTP for ${meetingTitle}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Meeting Verification OTP</title>
                </head>
                <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                        <tr>
                            <td style="background: #0f172a; padding: 24px 30px; text-align: center;">
                                <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">Office Management System</h2>
                                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Field Visit Verification</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <p style="color: #334155; font-size: 15px; margin-top: 0;">Hello <strong>${clientName}</strong>,</p>
                                <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                                    Our executive is present at your location for <strong>${meetingTitle}</strong>. Please share this secure 6-digit One-Time Password with our executive to confirm and verify the in-person meeting:
                                </p>
                                <div style="text-align: center; margin: 28px 0;">
                                    <div style="display: inline-block; background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 14px 28px;">
                                        <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">
                                            ${otp}
                                        </span>
                                    </div>
                                </div>
                                <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
                                    ⚠️ This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone other than the visiting executive.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #f8fafc; padding: 16px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
                                <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                                    &copy; ${new Date().getFullYear()} OfficeHRM · Automated Security Notification
                                </p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Service] OTP sent to ${email}. Message ID:`, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("[Email Service] Error sending Email OTP:", error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendWhatsAppOTP,
    sendEmailOTP
};

