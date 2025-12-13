import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { sports } from '@/app/utils/forms/schema';

interface PaymentConfirmedData {
    name?: string;
    email: string;
    universityName?: string;
    paymentId: string;
    transactionId: string;
    amountInNumbers: number;
    amountInWords: string;
    paymentDate: Date;
    paymentData: string; // JSON string with sport details
}

export async function sendPaymentConfirmedEmail(
    formData: PaymentConfirmedData,
): Promise<void> {
    try {
        // Validate email address
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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

        type SubmittedSport = {
            Players: number;
        };

        type PaymentData = {
            submittedForms?: Record<string, SubmittedSport>;
        };

        let payment: PaymentData;
        try {
            payment = JSON.parse(formData.paymentData);
        } catch (err) {
            throw new Error(`Failed to parse payment data JSON: ${(err instanceof Error) ? err.message : String(err)}`);
        }

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
        const templatePath = path.join(process.cwd(), "templates", "payment-confirmed.html");
        let htmlTemplate = fs.readFileSync(templatePath, "utf8");

        // Replace placeholders to match template
        htmlTemplate = htmlTemplate
            .replace(/{{name}}/g, formData.name || 'Participant')
            .replace(/{{registration_id}}/g, formData.paymentId || '')
            .replace(/{{payeeName}}/g, formData.name || '')
            .replace(/{{institution}}/g, formData.universityName || '')
            .replace(/{{paymentTypes}}/g, 'Registration Fee')
            .replace(/{{paymentMode}}/g, 'Online')
            .replace(/{{amountInNumbers}}/g, formData.amountInNumbers.toLocaleString('en-IN'))
            .replace(/{{amountInWords}}/g, formData.amountInWords.toUpperCase())
            .replace(/{{transactionId}}/g, formData.transactionId || '')
            .replace(/{{paymentDate}}/g, new Date(formData.paymentDate).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }))
            .replace(/{{current_year}}/g, new Date().getFullYear().toString())
            // Remove handlebars conditionals and replace with sports table
            .replace(/{{#if sportsTable}}[\s\S]*?{{sportsTable}}[\s\S]*?{{\/if}}/g, `<table class="payment-table">${paymentData}</table>`)
            .replace(/{{#if remarks}}[\s\S]*?{{\/if}}/g, ''); // Remove remarks section

        // Send email (separate thread with unique subject and message ID)
        await transporter.sendMail({
            from: `"Agneepath Registration" <${SMTP_USER}>`,
            to: formData.email,
            subject: `Registration Confirmed for Agneepath 7.0 | ${formData.universityName || 'Participant'}`,
            html: htmlTemplate,
            messageId: `<agneepath-confirmation-${formData.paymentId}-${Date.now()}@agneepath.co.in>`,
        });

        console.log(`✅ Payment confirmation email sent to ${formData.email} (Transaction: ${formData.transactionId})`);
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
        throw error;
    }
}
