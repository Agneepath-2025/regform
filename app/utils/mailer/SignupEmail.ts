import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { encrypt } from "@/app/utils/encryption";

interface SignupEmailData {
  name: string;
  email: string;
  universityName?: string;
  signupMethod: "google" | "form";
  verificationToken?: string;
}

export async function sendSignupConfirmationEmail(data: SignupEmailData): Promise<void> {
  try {
    // Validate email address
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      console.error(`❌ Invalid email address: ${data.email}`);
      return; // Don't throw - we don't want to block signup
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ROOT_URL } = process.env;

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

    // Read HTML template
    const templatePath = path.join(process.cwd(), "templates", "signup.html");
    let emailContent = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    emailContent = emailContent
      .replace(/{{name}}/g, data.name)
      .replace(/{{email}}/g, data.email)
      .replace(/{{institution}}/g, data.universityName || "Not provided yet")
      .replace(/{{current_year}}/g, new Date().getFullYear().toString());

    // Handle verification link for form signups
    if (data.signupMethod === "form" && data.verificationToken) {
      const verificationLink = `${ROOT_URL}Verification/verify?e=${encrypt({ email: data.email })}&i=${encrypt({ vid: data.verificationToken })}`;
      emailContent = emailContent.replace(
        /{{#if verification_link}}([\s\S]*?){{\/if}}/g,
        (match, content) => {
          return content.replace(/{{verification_link}}/g, verificationLink);
        }
      );
    } else {
      // Remove verification link section for Google OAuth signups
      emailContent = emailContent.replace(/{{#if verification_link}}[\s\S]*?{{\/if}}/g, "");
    }

    // Generate unique message ID to prevent threading
    const uniqueMessageId = `<signup-${Date.now()}-${data.email}@agneepath.co.in>`;

    await transporter.sendMail({
      from: `"Agneepath Registration" <${SMTP_USER}>`,
      to: data.email,
      // cc: ['jiya.vaya_ug2024@ashoka.edu.in','vidishaa.mundhra_ug2025@ashoka.edu.in','nishka.desai_ug2024@ashoka.edu.in','nishita.agarwal_ug2024@ashoka.edu.in'],
      subject: "Welcome to Agneepath 7.0",
      html: emailContent,
      headers: {
        "X-Gm-NoSave": "1",
        "Message-ID": uniqueMessageId,
        "X-Entity-Ref-ID": uniqueMessageId,
      },
    });

    console.log(`✅ Signup confirmation email sent to ${data.email}`);
  } catch (error) {
    console.error("❌ Failed to send signup confirmation email:", error);
    // Don't throw - we don't want to block signup if email fails
  }
}
