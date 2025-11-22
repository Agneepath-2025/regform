# Event-Driven Google Sheets Sync 🚀

## Overview

This is a **much more efficient** alternative to the auto-sync service. Instead of polling MongoDB every 5 seconds, data is synced to Google Sheets **only when it changes**.

### ✅ Benefits vs Auto-Sync

| Feature | Auto-Sync (Polling) | Event-Driven Sync |
|---------|---------------------|-------------------|
| **Server Load** | High (continuous polling) | Minimal (only on events) |
| **API Calls** | ~17,000/day | Only when data changes |
| **Latency** | Up to 5 seconds delay | Instant (on submission) |
| **Resource Usage** | CPU runs every 5 seconds | CPU idle until submission |
| **Scalability** | Poor (increases with time) | Excellent (scales with usage) |
| **Cost** | Higher (more API quota) | Lower (pay per use) |

**Recommended:** Use event-driven sync for production. It's more efficient and uses 99% less resources.

---

## 🔧 Setup

### 1. Disable Auto-Sync (if enabled)

In your `.env.local`:
```env
AUTO_SYNC_ENABLED=false
```

### 2. Verify Google Sheets Credentials

Make sure these are set in `.env.local`:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-spreadsheet-id-here
```

### 3. Create Sheet Tabs

In your Google Sheet, create three tabs with **exact** names:
- `Sheet1` (for registration forms)
- `Users` (for user registrations)
- `Payments` (for payment submissions)

### 4. Share the Sheet

Share your Google Sheet with the service account email (Editor permission).

---

## 📊 How It Works

### Automatic Syncing

Data syncs automatically when:

1. **Form Submission** → Syncs to `Sheet1` tab
   - Triggered when a user submits a registration form (not draft)
   - Appends new row with form data

2. **Payment Submission** → Syncs to `Payments` tab
   - Triggered when a user submits payment details
   - Appends new row with payment data

3. **User Registration** → Syncs to `Users` tab
   - (You can add sync calls when users are created)

### Initial Setup (First Time Only)

To populate existing data in your database:

```bash
# Run the initial sync once
curl -X POST http://localhost:3000/api/sync/event \
  -H "Content-Type: application/json" \
  -d '{"action": "initial"}'
```

This will:
- Clear all sheets
- Write headers
- Populate all existing forms, users, and payments
- Format headers (bold + gray background)

---

## 🎯 Usage

### Check Sync Status

```bash
curl http://localhost:3000/api/sync/event
```

Response:
```json
{
  "success": true,
  "mode": "event-driven",
  "description": "Forms, users, and payments sync automatically when submitted"
}
```

### Run Initial Sync

```bash
curl -X POST http://localhost:3000/api/sync/event \
  -H "Content-Type: application/json" \
  -d '{"action": "initial"}'
```

Response:
```json
{
  "success": true,
  "message": "Initial sync completed successfully",
  "counts": {
    "forms": 42,
    "users": 128,
    "payments": 35
  }
}
```

---

## 📈 Data Synced

### Sheet1 (Forms)
- Form ID
- Owner ID
- Sport/Event
- Status
- Created At
- Updated At
- Player Count
- Player Names
- Coach Name
- Coach Contact

### Users Tab
- User ID
- Name
- Email
- University
- Verified
- Registration Done
- Payment Done
- Created At

### Payments Tab
- Payment ID
- Owner ID
- Amount (Numbers)
- Amount (Words)
- Payment Mode
- Transaction ID
- Payee Name
- Payment Date
- Status
- Created At

---

## 🔍 Monitoring

### Server Logs

When forms/payments are submitted, you'll see:
```
[Sheets] ✅ Synced form submission: 507f1f77bcf86cd799439011
[Sheets] ✅ Synced payment: 507f1f77bcf86cd799439012
```

If sync fails (non-blocking):
```
[Sheets] Background sync failed: Requested entity was not found
```

### Check Your Google Sheet

Data appears **immediately** after submission. No delay.

---

## 🛠️ Troubleshooting

### Forms Submit But Don't Appear in Sheet

1. **Check credentials** in `.env.local`
2. **Verify sheet ID** (just the ID, not full URL)
3. **Check tab names** are exactly: `Sheet1`, `Users`, `Payments`
4. **Check sharing** - service account has Editor permission
5. **Look at server logs** for error messages

### "Credentials not configured" warning

Add these to `.env.local`:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="..."
GOOGLE_SHEET_ID=...
```

### "Requested entity was not found"

- Wrong spreadsheet ID, or
- Sheet tabs don't exist with exact names

---

## 🚀 Production Deployment

### Vercel/Railway/etc.

1. Set environment variables in your hosting dashboard
2. Make sure `GOOGLE_PRIVATE_KEY` has `\n` preserved (use quotes)
3. Deploy and test with a form submission
4. Run initial sync after deployment:
   ```bash
   curl -X POST https://your-domain.com/api/sync/event \
     -H "Content-Type: application/json" \
     -d '{"action": "initial"}'
   ```

### Resource Usage

Event-driven sync uses **minimal resources**:
- No background processes
- No continuous polling
- Only runs when data changes
- Non-blocking (doesn't slow down submissions)

**API Quota:** If you get 100 form submissions per day, you'll use only ~100 API calls (vs 17,000 with auto-sync).

---

## 🔄 Migration from Auto-Sync

If you're switching from the auto-sync service:

1. Set `AUTO_SYNC_ENABLED=false` in `.env.local`
2. Restart your dev server
3. Run initial sync to ensure data is up to date
4. Test by submitting a form and checking the sheet

The old auto-sync code stays in place but won't run. You can remove it later if desired.

---

## 💡 Tips

1. **Initial sync** only needs to run once (or after data recovery)
2. **Sync is non-blocking** - form submissions succeed even if sheets sync fails
3. **Check server logs** to monitor sync activity
4. **Event-driven is production-ready** and scales well
5. **No need to manually add columns** - headers are created automatically

---

## 📞 Need Help?

Check:
- Server logs for error messages
- Google Sheets API quota in Google Cloud Console
- Service account permissions
- Environment variables are set correctly

This event-driven approach is the **recommended production solution** for syncing data to Google Sheets.
