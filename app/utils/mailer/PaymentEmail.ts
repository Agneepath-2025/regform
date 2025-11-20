import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

interface PaymentFormData {
    name?:string,
    email?:string,
    institution?: string,
    registration_id?: string,
    paymentMode: string;
    amountInNumbers: number;
    amountInWords: string;
    payeeName: string;
    transactionId: string;
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

        // Load the HTML template
        const templatePath = path.join(process.cwd(), "templates", "payment-unconfirmed.html");
        let htmlTemplate = fs.readFileSync(templatePath, "utf8");

        // Replace placeholders
        htmlTemplate = htmlTemplate
            .replace(/{{name}}/g, formData.name || '')
            .replace(/{{institution}}/g, formData.institution || '')
            .replace(/{{registration_id}}/g, formData.registration_id || '')
            .replace(/{{amount}}/g, formData.amountInNumbers.toLocaleString('en-IN'))
            .replace(/{{amount_words}}/g, formData.amountInWords.toUpperCase())
            .replace(/{{payment_mode}}/g, formData.paymentMode)
            .replace(/{{submitted_at}}/g, new Date(formData.paymentDate).toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }))
            .replace(/{{current_year}}/g, new Date().getFullYear().toString());

        // Send email
        await transporter.sendMail({
            from: `"Agneepath Payments" <${SMTP_USER}>`,
            to: formData.email,
            // cc: ['vibha.rawat_ug2023@ashoka.edu.in','muhammed.razinmn_ug2023@ashoka.edu.in','dhruv.goyal_ug25@ashoka.edu.in','agneepath@ashoka.edu.in'],
            // cc: ['jiya.vaya_ug2024@ashoka.edu.in','vidishaa.mundhra_ug2025@ashoka.edu.in','nishka.desai_ug2024@ashoka.edu.in','nishita.agarwal_ug2024@ashoka.edu.in'],
            subject: `Payment Submitted - Transaction ID: ${formData.transactionId}`,
            html: htmlTemplate,
            attachments: [
                ...attachments
            ]
        });

        // res.status(200).json({ message: "Payment confirmation email sent successfully" });
    } catch (error) {
        console.error("Error sending payment confirmation email:", error);
        // res.status(500).json({ error: "Failed to send payment confirmation email" });
    }
}
