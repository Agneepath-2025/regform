import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { sports } from '@/app/utils/forms/schema';

interface PaymentFormData {
    name?:string,
    email?:string,
    universityName?: string,
    registration_id?: string,
    paymentMode: string;
    amountInNumbers: number;
    amountInWords: string;
    payeeName: string;
    transactionId: string;
    paymentDate: Date;
    paymentProof?: string;
    remarks?: string;
    paymentData: string;
    paymentId: string;
}

export async function sendPaymentConfirmationEmail(
    formData: PaymentFormData,
): Promise<void> {
    try {
        // Validate email address
        if (!formData.email) {
            throw new Error("Email address is required and must be valid");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            throw new Error(`Invalid email address: ${formData.email}`);
        }

        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
            throw new Error("Email configuration missing in environment variables");
        }

        if (!SMTP_HOST.trim() || !SMTP_USER.trim() || !SMTP_PASS.trim()) {
            throw new Error("Email configuration contains empty values");
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

        type SubmittedSport = {
          Players: number;
        };

        type PaymentData = {
          submittedForms?: Record<string, SubmittedSport>;
        };

        const payment: PaymentData = JSON.parse(formData.paymentData);

        const calculateSportsTotal = () => {
          if (!payment.submittedForms) return 0;

          return Object.values(payment.submittedForms).reduce((total, sport) => {
            return total + sport.Players * 800;
          }, 0);

        }

        let paymentData = "<tr><td colspan='3' style='padding:10px;background-color:#dbeafe;font-weight:600'><strong>Registration Details</strong></td></tr><tr><th>Sport</th><th>Players</th><th>Registration Fee</th></tr>";
        for (const [sport, data] of Object.entries(payment.submittedForms ?? {})) {
          paymentData += `<tr class='label'><td>${sports[sport]}</td><td>${data.Players}</td><td>₹${data.Players * 800}</td></tr>`
        }

        paymentData += `<tr><th>Total Registration Fee</th><th></th><th>₹${calculateSportsTotal()}</th></tr>`

        // Load the HTML template
        const templatePath = path.join(process.cwd(), "templates", "payment-unconfirmed.html");
        let htmlTemplate = fs.readFileSync(templatePath, "utf8");

        console.log(formData.universityName)

        // Replace placeholders
        htmlTemplate = htmlTemplate
            .replace(/{{name}}/g, formData.name || '')
            .replace(/{{institution}}/g, formData.universityName || '')
            .replace(/{{payment_id}}/g, formData.paymentId || '')
            .replace(/{{amount}}/g, formData.amountInNumbers.toLocaleString('en-IN'))
            .replace(/{{amount_words}}/g, formData.amountInWords.toUpperCase())
            .replace(/{{payment_mode}}/g, formData.paymentMode === "bank" ? "Bank Transfer" : "Unknown")
            .replace(/{{submitted_at}}/g, new Date(formData.paymentDate).toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }))
            .replace(/{{current_year}}/g, new Date().getFullYear().toString())
            .replace(/{{payment_data_rows}}/g, paymentData);

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

        console.log(`✅ Payment confirmation email sent successfully to ${formData.email} (Transaction: ${formData.transactionId})`);
    } catch (error) {
        const logData: Record<string, string | undefined> = {
            email: formData.email,
            transactionId: formData.transactionId,
            error: error instanceof Error ? error.message : String(error),
        };
        if (process.env.NODE_ENV === 'development' && error instanceof Error && error.stack) {
            logData.stack = error.stack;
        }
        console.error("❌ Error sending payment confirmation email:", logData);
        throw error; // Re-throw to allow caller to handle
    }
}
