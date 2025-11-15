import nodemailer from "nodemailer";
import { sports } from "../forms/schema";

interface PaymentFormData {
    name?:string,
    email?:string,
    paymentMode: string;
    amountInNumbers: number;
    amountInWords: string;
    payeeName: string;
    transactionId: string;
    accommodationPeople?:number,
    accommodationPrice?:number,
    paymentDate: Date;
    paymentProof?: string;
    remarks?: string;
}

export async function sendPaymentConfirmationEmail(
    formData: PaymentFormData,
): Promise<void> {
    try {
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
            throw new Error("Email configuration missing in environment variables");
        }

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT || "587"),
            secure: false,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Prepare attachments if payment proof exists
        const attachments = [];
        if (formData.paymentProof) {
            // If paymentProof is a data URL string: "data:<mime>;base64,<b64>"
            if (typeof formData.paymentProof === "string" && formData.paymentProof.startsWith("data:")) {
                const match = formData.paymentProof.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    const mime = match[1]; // e.g. "application/pdf" or "image/png"
                    const b64 = match[2];
                    const buffer = Buffer.from(b64, "base64");
                    const ext = mime.split("/")[1]?.split("+")[0] ?? "bin";
                    attachments.push({
                        filename: `payment-proof.${ext}`,
                        content: buffer,
                        contentType: mime,
                    });
                }
            } else if (typeof formData.paymentProof === "string") {
                // Already a file path/URL — skip or log
                console.log("Payment proof is a path, not a data URL:", formData.paymentProof);
            }
        }

        // Generate payment details table
        const paymentDetailsTable = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td colspan="2" style="padding: 10px; background-color: #f0f0f0;">
            <strong>Payment Details</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Payee Name</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formData.payeeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Mode</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formData.paymentMode}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">₹${formData.amountInNumbers.toLocaleString('en-IN')} (${formData.amountInWords.toUpperCase()})</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Transaction ID</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formData.transactionId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Date</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(formData.paymentDate).toLocaleDateString('en-IN')}</td>
        </tr>
        ${formData.remarks ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Remarks</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formData.remarks}</td>
        </tr>
        ` : ''}
      </table>
    `;

        // Generate accommodation details table
        const accommodationTable = formData.accommodationPeople && formData.accommodationPrice ? `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td colspan="3" style="padding: 10px; background-color: #f0f0f0;">
            <strong>Accommodation Details</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background-color: #f8f8f8;"><strong>Number of People</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; background-color: #f8f8f8;"><strong>Price per Person</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; background-color: #f8f8f8;"><strong>Total Amount</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${formData.accommodationPeople}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">₹${formData.accommodationPrice.toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">₹${(formData.accommodationPeople * formData.accommodationPrice).toLocaleString()}</td>
        </tr>
      </table>
    ` : '';

        const emailContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="text-align: center; color: #ed810c;">Payment Confirmation - Agneepath 6.0</h2>
        
        <p>Dear ${formData.name},</p>
        
        <p>Thank you for submitting your payment for Agneepath 6.0. This email confirms that we have received your payment details and they are currently under review by our team.</p>
        
        ${paymentDetailsTable}
        ${accommodationTable}
        
        <p><strong>Note:</strong> Our team will review your payment details and send you a confirmation email once verified. Please allow up to 48-72 hours for the verification process.</p>
        
        <p>If you have any questions or concerns, please contact us at <a href="mailto:agneepath@ashoka.edu.in" style="color: #ed810c; text-decoration: none;">agneepath@ashoka.edu.in</a> or you can also make a support request by going to the <a href="register.agneepath.co.in" style="color: #ed810c; text-decoration: none;">dashboard</a>.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>Team Agneepath 6.0<br>Ashoka University</p>
        
        <img src="cid:unique-image-cid" alt="Agneepath Logo" style="max-width: 15%; height: auto;" />
      </div>
    `;

        // Send email
        await transporter.sendMail({
            from: `"Payments" <${SMTP_USER}>`,
            to: formData.email,
            //2025 OC - cc :['vibha.rawat_ug2023@ashoka.edu.in','muhammed.razinmn_ug2023@ashoka.edu.in','dhruv.goyal_ug25@ashoka.edu.in','agneepath@ashoka.edu.in'],
            //cc :['jiya.vaya_ug2024@ashoka.edu.in','vidishaa.mundhra_ug2025@ashoka.edu.in','nishka.desai_ug2024@ashoka.edu.in','nishita.agarwal_ug2024@ashoka.edu.in'],
            subject: `Payment Confirmation - Transaction ID: ${formData.transactionId}`,
            html: emailContent,
            attachments: [
                ...attachments,
                {
                    filename: "logo.png",
                    path: `${process.env.LOGO}`,
                    cid: "unique-image-cid",
                    encoding: "base64"
                }
            ]
        });

        // res.status(200).json({ message: "Payment confirmation email sent successfully" });
    } catch (error) {
        console.error("Error sending payment confirmation email:", error);
        // res.status(500).json({ error: "Failed to send payment confirmation email" });
    }
}
