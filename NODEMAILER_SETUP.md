# Nodemailer Setup & Troubleshooting Guide for RegForm

## 🔧 What Was Fixed

### Issues Found:
1. **Incorrect `from` field** in `ConfirmationMail.ts`:
   - ❌ `from: "Registation <SMTP_USER>"` (used string literal instead of variable)
   - ✅ `from: "Agneepath Registration <${SMTP_USER}>"`

2. **Missing connection verification** before sending emails
   - Added `await transporter.verify()` to check SMTP connection first

3. **Missing cipher configuration** for Gmail
   - Added `ciphers: 'SSLv3'` to TLS config

### Files Updated:
- ✅ `app/utils/mailer/ConfirmationMail.ts`
- ✅ `app/api/Mailer/Verification/route.ts`
- ✅ `app/utils/mailer/PaymentEmail.ts`
- ✅ Created `test-nodemailer.js` for testing

---

## 📧 Gmail Setup Requirements

### Step 1: Enable 2-Step Verification
1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification**

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other** as the device (name it "Agneepath RegForm")
4. Click **Generate**
5. **Copy the 16-character password** (format: xxxx xxxx xxxx xxxx)

### Step 3: Update .env.production
```bash
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=agneepath@ashoka.edu.in
SMTP_PASS=your-16-char-app-password-here  # Replace with generated app password
```

**⚠️ Important:** 
- Use the **App Password**, NOT your regular Gmail password
- Remove spaces from the 16-character code
- Keep this password secret and never commit to git

---

## 🧪 Testing Nodemailer

### Run the Test Script
```bash
cd /Users/nitin/Documents/agneepath/RegForm
node test-nodemailer.js
```

### Expected Output (Success):
```
🔍 Testing Nodemailer Configuration

📋 Environment Variables:
   SMTP_HOST: smtp.gmail.com
   SMTP_PORT: 587
   SMTP_USER: agneepath@ashoka.edu.in
   SMTP_PASS: ✅ Set (hidden)

📧 Testing SMTP connection...
✅ SMTP connection successful!

📤 Sending test email...
✅ Test email sent successfully!
   Message ID: <xxxx@gmail.com>
   Response: 250 2.0.0 OK

🎉 All tests passed!
```

### Common Errors & Solutions:

#### ❌ Error: `EAUTH - Authentication failed`
**Cause:** Wrong credentials or missing App Password

**Solution:**
1. Verify SMTP_USER is correct in .env.production
2. Generate a new App Password (Step 2 above)
3. Update SMTP_PASS with the new App Password
4. Ensure no spaces in the password

#### ❌ Error: `ETIMEDOUT` or `ECONNECTION`
**Cause:** Firewall blocking port 587 or network issue

**Solution:**
1. Check your internet connection
2. Try alternative configuration:
   ```javascript
   {
     host: 'smtp.gmail.com',
     port: 465,
     secure: true,  // Use SSL instead of TLS
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
     }
   }
   ```
3. Check if university network blocks SMTP ports
4. Try from a different network

#### ❌ Error: `ESOCKET`
**Cause:** Socket connection error

**Solution:**
1. Use port 465 with `secure: true`
2. Add longer timeout: `connectionTimeout: 60000`
3. Check DNS resolution

#### ❌ Error: `Missing credentials`
**Cause:** Environment variables not loaded

**Solution:**
1. Verify .env.production file exists
2. Ensure dotenv.config() is called:
   ```javascript
   import dotenv from 'dotenv';
   dotenv.config({ path: '.env.production' });
   ```
3. Check file permissions: `chmod 600 .env.production`

---

## 🚀 Usage in Your Application

### Sending Verification Emails
```typescript
// app/api/Mailer/Verification/route.ts
POST /api/Mailer/Verification
Body: { email: "user@example.com" }
```

### Sending Confirmation Emails
```typescript
// app/utils/mailer/ConfirmationMail.ts
import sendConfirmationEmail from '@/app/utils/mailer/ConfirmationMail';

await sendConfirmationEmail(formData);
```

### Sending Payment Emails
```typescript
// app/utils/mailer/PaymentEmail.ts
import sendPaymentConfirmationEmail from '@/app/utils/mailer/PaymentEmail';

await sendPaymentConfirmationEmail(paymentData);
```

---

## 🔍 Debugging Tips

### Enable Debug Mode
Add to transporter config:
```javascript
const transporter = nodemailer.createTransport({
  // ... other config
  debug: true,    // Show SMTP traffic
  logger: true    // Log to console
});
```

### Check Email Logs
Monitor the console output for:
- ✅ `SMTP connection verified` - Connection successful
- ❌ `SMTP verification failed` - Connection failed
- ✅ `Confirmation email sent successfully` - Email sent

### Verify Email Delivery
1. Check recipient's inbox (including spam folder)
2. Check Gmail sent folder: https://mail.google.com/mail/u/0/#sent
3. Check Gmail activity: https://myaccount.google.com/recent-security-events

---

## 📝 Current Configuration Summary

### Production Setup (.env.production):
```bash
# Active Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=agneepath@ashoka.edu.in
SMTP_PASS=csrokimjlcudbjnj  # ⚠️ Update if authentication fails
```

### Transporter Configuration:
```typescript
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,           // Use STARTTLS
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false,  // Accept self-signed certs
    ciphers: 'SSLv3'           // Required for Gmail
  }
}
```

---

## 🔐 Security Best Practices

1. **Never commit .env files to git**
   ```bash
   # Add to .gitignore
   .env*
   !.env.example
   ```

2. **Remove old commented credentials**
   - Clean up .env.production file
   - Remove lines 7-9 (old passwords)

3. **Rotate passwords regularly**
   - Generate new App Passwords every 6 months
   - Revoke old App Passwords

4. **Use environment-specific files**
   - `.env.development` for local testing
   - `.env.production` for production server
   - Never mix configurations

---

## 📞 Support

If nodemailer still doesn't work after following this guide:

1. **Run the test script** and share the full output
2. **Check Gmail security events**: https://myaccount.google.com/recent-security-events
3. **Verify 2-Step Verification** is enabled
4. **Try generating a new App Password**
5. **Check server/network firewall** settings

Common university network restrictions:
- SMTP ports (25, 465, 587) may be blocked
- Use university VPN if available
- Test from personal hotspot to rule out network issues

---

## ✅ Quick Checklist

Before deploying to production:

- [ ] 2-Step Verification enabled on Gmail
- [ ] App Password generated and saved
- [ ] .env.production updated with App Password
- [ ] Test script runs successfully: `node test-nodemailer.js`
- [ ] Test verification email sent
- [ ] Test confirmation email sent
- [ ] Check email lands in inbox (not spam)
- [ ] Remove duplicate MONGODB_URI from .env.production (line 45)
- [ ] Remove old commented passwords (lines 7-9)
- [ ] Verify all email recipients receive emails
- [ ] Check CC recipients get copies

---

## 📚 Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

Last Updated: November 9, 2025
