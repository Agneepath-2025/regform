// Test nodemailer configuration for RegForm
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: '.env.production' });

async function testNodemailer() {
  console.log("🔍 Testing Nodemailer Configuration\n");
  
  // Check environment variables
  console.log("📋 Environment Variables:");
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || '❌ Not set'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '❌ Not set'}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER || '❌ Not set'}`);
  console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set (hidden)' : '❌ Not set'}`);
  console.log();

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ Missing SMTP credentials in .env.production file");
    process.exit(1);
  }

  try {
    // Create transporter with proper configuration for Gmail
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      debug: true, // Enable debug output
      logger: true  // Log to console
    });

    console.log("📧 Testing SMTP connection...");
    
    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection successful!\n");

    // Send test email
    console.log("📤 Sending test email...");
    const info = await transporter.sendMail({
      from: `"Agneepath Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: "Test Email from RegForm",
      text: "This is a test email to verify nodemailer configuration.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ed810c;">Test Email</h2>
          <p>If you're seeing this, nodemailer is working correctly!</p>
          <p>Configuration:</p>
          <ul>
            <li>Host: ${process.env.SMTP_HOST}</li>
            <li>Port: ${process.env.SMTP_PORT}</li>
            <li>User: ${process.env.SMTP_USER}</li>
          </ul>
          <p style="color: #666; font-size: 12px;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `
    });

    console.log("✅ Test email sent successfully!");
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log("\n🎉 All tests passed!");

  } catch (error) {
    console.error("\n❌ Error occurred:");
    console.error(`   Type: ${error.name}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.error("\n💡 Authentication failed. Possible causes:");
      console.error("   1. Incorrect email/password");
      console.error("   2. Gmail App Password not generated (required for Gmail)");
      console.error("   3. 2-Step Verification not enabled");
      console.error("\n📝 To fix Gmail authentication:");
      console.error("   1. Enable 2-Step Verification: https://myaccount.google.com/security");
      console.error("   2. Generate App Password: https://myaccount.google.com/apppasswords");
      console.error("   3. Use the 16-character app password in SMTP_PASS");
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error("\n💡 Connection failed. Possible causes:");
      console.error("   1. Firewall blocking port 587");
      console.error("   2. SMTP server down or unreachable");
      console.error("   3. Incorrect SMTP_HOST setting");
    } else if (error.code === 'ESOCKET') {
      console.error("\n💡 Socket error. Try:");
      console.error("   1. Check your internet connection");
      console.error("   2. Try port 465 with secure: true");
    }
    
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run the test
testNodemailer();
