import { encrypt } from "@/app/utils/encryption";
import { connectToDatabase } from "@/lib/mongodb";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
/* eslint-disable @typescript-eslint/no-unused-vars */

dotenv.config();

async function getVerificationId(email: string): Promise<string | null> {
  const { db } = await connectToDatabase();
  const collection = db.collection("users");
  const user = await collection.findOne({ email });
  return user?.VerificationId || null;
}

async function sendEmail(to: string, id: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ROOT_URL } = process.env;

  if (!SMTP_USER || !SMTP_PASS || !ROOT_URL) {
    throw new Error("Email configuration missing in environment variables");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // const vlink = `${ROOT_URL}verify?token=${id}`;
  const emailContent = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
    <h2 style="text-align: center; color: #ed810c;">Email Verification</h2>
    <p>Hi,</p>
    <p>Thank you for registering for Agneepath sports fest. Kindly verify your email by clicking the button below:</p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${ROOT_URL}Verification/verify?e=${encrypt({ email: to })}&i=${encrypt({ vid: id })}" 
         style="display: inline-block; background-color: #ed810c; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;">
        Verify Email
      </a>
    </div>
    <p>For any queries contact us at <a href="mailto:agneepath@ashoka.edu.in" style="color: #ed810c; text-decoration: none;">agneepath@ashoka.edu.in</a></p>
    <p>Best regards,<br>Team Agneepath</p>
    <img src="cid:unique-image-cid" alt="Agneepath Logo" style="max-width: 15%; height: auto;" />

  </div>
`;
const attachments = [
  {
    filename: "logo2.png", // Name of the image
    path: `${process.env.LOGO}`, // Path to the image file (you can use a local file or an image URL)
    cid: "unique-image-cid", // The unique content ID
    encoding: "base64"
  }
];


  await transporter.sendMail({
    from: `"Agneepath" <${SMTP_USER}>`,
    to,
    cc :['jiya.vaya_ug2024@ashoka.edu.in','vidishaa.mundhra_ug2025@ashoka.edu.in','nishka.desai_ug2024@ashoka.edu.in','nishita.agarwal_ug2024@ashoka.edu.in'],
    subject: "Verify your account",
    headers: {
      "X-Gm-NoSave": "1", // Custom header to prevent saving in Sent folder
    },
    // text: `Please verify your email using this Link: ${vlink}`,
    html: emailContent,attachments  });
    
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    // Check if user is already verified
    const { db } = await connectToDatabase();
    const collection = db.collection("users");
    const user = await collection.findOne({ email });
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (user.emailVerified === true) {
      return new Response(
        JSON.stringify({ message: "Email is already verified" }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const verificationId = await getVerificationId(email);

    if (!verificationId) {
      return new Response(
        JSON.stringify({ error: "VerificationId not found" }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    await sendEmail(email, verificationId);
    return new Response(
      JSON.stringify({ message: "Email sent successfully" }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    // console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
