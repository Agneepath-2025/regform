# Google Sheets Sync - Setup Guide

This guide will help you set up automatic syncing of MongoDB data to Google Sheets.

---

## 📋 Prerequisites

- Google Cloud account
- Access to your Google Sheet
- Admin access to the Next.js application

---

## 🚀 Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a Project"** → **"New Project"**
3. Name it (e.g., "Sports Mailer Sheets Sync")
4. Click **"Create"**

---

### Step 2: Enable Google Sheets API

1. In your Google Cloud project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Sheets API"**
3. Click on it and press **"Enable"**

---

### Step 3: Create a Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in the details:
   - **Service account name**: `sheets-sync-service`
   - **Service account ID**: (auto-generated)
   - **Description**: "Service account for syncing MongoDB to Google Sheets"
4. Click **"Create and Continue"**
5. Skip the optional steps by clicking **"Done"**

---

### Step 4: Generate Service Account Key

1. In **"Credentials"**, find your newly created service account
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"**
7. A JSON file will download automatically - **KEEP THIS SAFE!**

The JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "sheets-sync-service@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

---

### Step 5: Create or Open Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet or open an existing one
3. Name the sheets (tabs) you want to use:
   - `Sheet1` for forms data
   - `Users` for user data
   - `Payments` for payment data
4. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
                                          ^^^^^^^^^^^^^^^^^^^
   ```

---

### Step 6: Share the Sheet with Service Account

**CRITICAL STEP:** The service account needs permission to edit your sheet.

1. In your Google Sheet, click **"Share"** (top-right)
2. Paste the **service account email** from the JSON file
   - Example: `sheets-sync-service@your-project.iam.gserviceaccount.com`
3. Set permission to **"Editor"**
4. **Uncheck** "Notify people" (it's a service account, not a person)
5. Click **"Share"**

---

### Step 7: Add Environment Variables

Open your `.env.local` file and add these variables:

```env
# Google Sheets Sync Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=sheets-sync-service@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_spreadsheet_id_here

# Optional: Restrict sync access to admin emails only
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

**Important notes:**
- Copy `client_email` from the JSON file to `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- Copy `private_key` from the JSON file to `GOOGLE_PRIVATE_KEY`
  - Keep the quotes around the private key
  - Keep the `\n` characters as-is (don't replace with actual newlines)
- Copy your spreadsheet ID from the URL to `GOOGLE_SHEET_ID`

---

### Step 8: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 🎯 How to Use

### Option 1: API Call (Command Line)

```bash
# Sync form data to Sheet1
curl -X POST http://localhost:3000/api/sync/sheets \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=YOUR_AUTH_TOKEN" \
  -d '{"collection": "form", "sheetName": "Sheet1"}'

# Sync user data
curl -X POST http://localhost:3000/api/sync/sheets \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=YOUR_AUTH_TOKEN" \
  -d '{"collection": "users", "sheetName": "Users"}'

# Sync payment data
curl -X POST http://localhost:3000/api/sync/sheets \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=YOUR_AUTH_TOKEN" \
  -d '{"collection": "payments", "sheetName": "Payments"}'
```

### Option 2: Create a Dashboard Button

Add this component to your admin dashboard:

```tsx
// In your admin dashboard component
const syncToSheets = async (collection: string) => {
  try {
    const response = await fetch('/api/sync/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        collection, 
        sheetName: collection === 'form' ? 'Sheet1' : collection 
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ Synced ${data.count} records to Google Sheets`);
    } else {
      alert(`❌ Error: ${data.message}`);
    }
  } catch (error) {
    console.error('Sync error:', error);
    alert('Failed to sync data');
  }
};

return (
  <div>
    <button onClick={() => syncToSheets('form')}>
      Sync Forms to Sheets
    </button>
    <button onClick={() => syncToSheets('users')}>
      Sync Users to Sheets
    </button>
    <button onClick={() => syncToSheets('payments')}>
      Sync Payments to Sheets
    </button>
  </div>
);
```

---

## 📊 What Gets Synced

### Form Data (Collection: `form`)
- Form ID, Owner ID
- Sport/Event name
- Status (draft/submitted)
- Created/Updated timestamps
- Player count and names
- Coach name and contact

### User Data (Collection: `users`)
- User ID, Name, Email
- University
- Verification status
- Registration and payment status
- Created timestamp

### Payment Data (Collection: `payments`)
- Payment ID, Owner ID
- Amount (numbers and words)
- Payment mode and transaction ID
- Payee name and payment date
- Status and created timestamp

---

## 🔒 Security Notes

1. **Never commit** your service account JSON file or `.env.local` to Git
2. The private key should always stay in `.env.local`
3. Only admin users (specified in `ADMIN_EMAILS`) can trigger syncs
4. The API checks authentication tokens before allowing sync

---

## 🐛 Troubleshooting

### Error: "Access denied for user"
- Make sure you shared the Google Sheet with the service account email
- Verify the email in `GOOGLE_SERVICE_ACCOUNT_EMAIL` matches the JSON file

### Error: "GOOGLE_SHEET_ID not configured"
- Check that you added the spreadsheet ID to `.env.local`
- Restart your dev server after adding environment variables

### Error: "Invalid credentials"
- Verify the private key is correctly copied (including `\n` characters)
- Make sure the key is wrapped in quotes in `.env.local`

### Error: "Unauthorized"
- You need to be logged in to use the sync API
- If `ADMIN_EMAILS` is set, your email must be in that list

### Error: "The caller does not have permission"
- The Google Sheets API might not be enabled
- Go back to Step 2 and enable the API

---

## 🔄 Automated Syncing (Optional)

To sync automatically on a schedule, you can use:

1. **Vercel Cron Jobs** (if deployed on Vercel)
2. **GitHub Actions** (scheduled workflows)
3. **External cron service** (like cron-job.org)

Example cron setup to sync daily at midnight:

```bash
0 0 * * * curl -X POST https://your-domain.com/api/sync/sheets -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Done!

Your MongoDB data will now sync to Google Sheets whenever you trigger the API endpoint.
