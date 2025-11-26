# Google Sheets Event-Driven Sync - API Documentation

## Overview

Event-driven sync system that automatically syncs MongoDB data to Google Sheets only when data changes. This replaces the wasteful time-based polling approach with an efficient on-demand sync.

**Resource Efficiency:**
- **Before**: ~17,000 API calls/day (polling every 5 seconds)
- **After**: ~100 API calls/day (only when data changes)
- **Savings**: 99% reduction in API quota usage

---

## Features

### ✅ Implemented Improvements

1. **Feature Toggle**
   - Environment variable: `SHEETS_SYNC_ENABLED` (default: `true`)
   - Set to `false` to disable sync without code changes

2. **Retry Logic**
   - Automatic retry with exponential backoff (up to 3 attempts)
   - Smart error detection (doesn't retry credential/permission errors)
   - Backoff timing: 1s, 2s, 4s

3. **Type Safety**
   - Proper TypeScript interfaces for all return types
   - Type-safe date formatting
   - Consistent string coercion for all cell values

4. **Centralized Configuration**
   - `SHEET_CONFIGS` object defines all sheet names and headers
   - Easy to update column definitions in one place
   - Reduces duplication and errors

5. **Enhanced Date Formatting**
   - Handles both `Date` objects and ISO strings
   - Timezone-aware (Asia/Kolkata)
   - Consistent format: `MM/DD/YYYY, HH:MM AM/PM`

6. **Dynamic Sheet Formatting**
   - Automatically fetches sheet IDs for all tabs
   - Formats headers (bold + gray) for all sheets, not just Sheet1
   - Graceful degradation if formatting fails

7. **Better Error Handling**
   - Descriptive error messages
   - Non-blocking sync (never fails user submissions)
   - Clear logging with prefixes: `[Sheets]` and `[Sheets API]`

8. **Status Endpoint**
   - Check configuration and enabled state
   - View environment settings without accessing env files

---

## Environment Variables

```env
# Required for sync to work
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-spreadsheet-id

# Optional feature flag (default: true)
SHEETS_SYNC_ENABLED=true
```

### Getting Credentials

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project

2. **Enable Google Sheets API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in details and create

4. **Generate Key**
   - Click on the service account
   - Go to "Keys" tab
   - "Add Key" > "Create new key" > "JSON"
   - Download the JSON file

5. **Extract Values**
   ```json
   {
     "client_email": "xxx@xxx.iam.gserviceaccount.com",  // GOOGLE_SERVICE_ACCOUNT_EMAIL
     "private_key": "-----BEGIN PRIVATE KEY-----\n..."    // GOOGLE_PRIVATE_KEY
   }
   ```

6. **Share Your Spreadsheet**
   - Open your Google Sheet
   - Click "Share"
   - Add the service account email as "Editor"

---

## API Endpoints

### GET `/api/sync/event`

Check sync status and configuration.

**Response:**
```json
{
  "success": true,
  "mode": "event-driven",
  "enabled": true,
  "configured": true,
  "description": "Forms, users, and payments sync automatically when submitted",
  "endpoints": {
    "status": "GET /api/sync/event - Check sync configuration",
    "initial_sync": "POST /api/sync/event with {\"action\": \"initial\"} - Run once to sync existing data"
  },
  "environment": {
    "SHEETS_SYNC_ENABLED": true,
    "hasCredentials": true
  }
}
```

**Usage:**
```bash
curl http://localhost:3000/api/sync/event
```

---

### POST `/api/sync/event`

Trigger initial full sync to populate all existing data.

**Request Body:**
```json
{
  "action": "initial"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Initial sync completed successfully",
  "counts": {
    "forms": 42,
    "users": 128,
    "payments": 35
  },
  "durationMs": 3452
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Google Sheets credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID",
  "durationMs": 120
}
```

**Usage:**
```bash
# Initial sync (run once on first setup)
curl -X POST http://localhost:3000/api/sync/event \
  -H "Content-Type: application/json" \
  -d '{"action": "initial"}'
```

---

## Automatic Sync Points

### Form Submission
**Triggered:** When `POST /api/form/saveForm` succeeds with `isDraft: false`

**Behavior:** 
- Checks if form ID already exists in column A of the sheet
- If exists: **Updates** the existing row with new data
- If not exists: **Appends** a new row

**Synced Data:**
- Form ID
- Owner ID
- Sport/Event
- Status
- Created At
- Updated At
- Player Count
- Player Names (comma-separated)
- Coach Name
- Coach Contact

**Sheet Tab:** `Sheet1`

**No Duplicates:** Re-submitting the same form will update the existing row, not create duplicates.

---

### Payment Submission
**Triggered:** When `POST /api/payments/submit` succeeds

**Behavior:** 
- Checks if payment ID already exists in column A of the sheet
- If exists: **Updates** the existing row with new data
- If not exists: **Appends** a new row

**Synced Data:**
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

**Sheet Tab:** `Payments`

**No Duplicates:** Re-submitting the same payment will update the existing row, not create duplicates.

---

### User Registration
**Triggered:** (Call `syncUserRegistration(userId)` when users are created)

**Behavior:** 
- Checks if user ID already exists in column A of the sheet
- If exists: **Updates** the existing row with new data
- If not exists: **Appends** a new row

**Synced Data:**
- User ID
- Name
- Email
- University
- Verified (Yes/No)
- Registration Done (Yes/No)
- Payment Done (Yes/No)
- Created At

**Sheet Tab:** `Users`

**No Duplicates:** Re-syncing the same user will update the existing row, not create duplicates.

---

## Function Reference

### `syncFormSubmission(formId: string): Promise<SyncResult>`

Sync a single form to Google Sheets.

**Parameters:**
- `formId`: MongoDB ObjectId string of the form

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Usage:**
```typescript
import { syncFormSubmission } from "@/app/utils/sheets-event-sync";

// Non-blocking (recommended)
syncFormSubmission(formId).catch(err => {
  console.error("Sync failed:", err);
});

// Blocking (wait for sync)
const result = await syncFormSubmission(formId);
if (!result.success) {
  console.error("Sync failed:", result.error);
}
```

---

### `syncPaymentSubmission(paymentId: string): Promise<SyncResult>`

Sync a single payment to Google Sheets.

**Parameters:**
- `paymentId`: MongoDB ObjectId string of the payment

**Returns:** Same as `syncFormSubmission`

---

### `syncUserRegistration(userId: string): Promise<SyncResult>`

Sync a single user to Google Sheets.

**Parameters:**
- `userId`: MongoDB ObjectId string of the user

**Returns:** Same as `syncFormSubmission`

---

### `initialFullSync(): Promise<InitialSyncResult>`

Sync all existing data from MongoDB to Google Sheets.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  counts?: {
    forms: number;
    users: number;
    payments: number;
  };
}
```

**Usage:**
```typescript
import { initialFullSync } from "@/app/utils/sheets-event-sync";

const result = await initialFullSync();
if (result.success) {
  console.log("Synced:", result.counts);
} else {
  console.error("Failed:", result.error);
}
```

---

## Setup Instructions

### First-Time Setup

1. **Set Environment Variables**
   ```bash
   # In .env.local
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID=your-spreadsheet-id-here
   SHEETS_SYNC_ENABLED=true
   ```

2. **Create Sheet Tabs**
   - Open your Google Sheet
   - Create three tabs with exact names:
     - `Sheet1` (for forms)
     - `Users` (for users)
     - `Payments` (for payments)

3. **Share the Sheet**
   - Click "Share"
   - Add service account email as "Editor"

4. **Run Initial Sync**
   ```bash
   curl -X POST http://localhost:3000/api/sync/event \
     -H "Content-Type: application/json" \
     -d '{"action": "initial"}'
   ```

5. **Verify**
   - Check the Google Sheet for data
   - Submit a test form/payment
   - Verify it appears in the sheet immediately

---

## Troubleshooting

### Sync Not Working

**Check Configuration:**
```bash
curl http://localhost:3000/api/sync/event
```

Look for:
- `"enabled": true` — sync is turned on
- `"configured": true` — credentials are set

**Common Issues:**

1. **"Credentials not configured"**
   - Missing env variables
   - Check `.env.local` file
   - Restart dev server after adding vars

2. **"Requested entity was not found"**
   - Wrong `GOOGLE_SHEET_ID`
   - Sheet tabs don't exist with exact names
   - Service account not shared on sheet

3. **"Permission denied"**
   - Service account not shared with "Editor" access
   - Sheet is in a restricted Google Drive folder

4. **Sync is disabled**
   - Check `SHEETS_SYNC_ENABLED` variable
   - Default is `true`, only set to `false` to disable

---

## Monitoring

### Server Logs

**Successful Sync:**
```
[Sheets] ✅ Synced form submission: 507f1f77bcf86cd799439011
[Sheets] ✅ Synced payment: 507f1f77bcf86cd799439012
```

**Failed Sync (Non-Blocking):**
```
[Sheets] Form sync failed (non-blocking): Requested entity was not found
```

**Retry Attempts:**
```
[Sheets] Attempt 1/3 failed, retrying in 1000ms...
[Sheets] Attempt 2/3 failed, retrying in 2000ms...
```

**Initial Sync:**
```
[Sheets API] Starting initial full sync...
[Sheets] Syncing forms...
[Sheets] ✅ Synced 42 forms
[Sheets] Syncing users...
[Sheets] ✅ Synced 128 users
[Sheets] Syncing payments...
[Sheets] ✅ Synced 35 payments
[Sheets] ✅ Headers formatted
[Sheets] ✅ Initial sync completed
```

---

## Performance & Scalability

### Current Approach
- **Single append per submission** — efficient for low-medium volume
- **No batching** — each submission syncs immediately
- **Non-blocking** — doesn't slow down user requests

### Recommended for High Volume (>1000/day)

If you get thousands of submissions per day, consider:

1. **Batch Syncing**
   ```typescript
   // Collect events for 30 seconds, then sync batch
   const pendingForms: string[] = [];
   
   export function queueFormSync(formId: string) {
     pendingForms.push(formId);
   }
   
   setInterval(async () => {
     if (pendingForms.length === 0) return;
     const batch = pendingForms.splice(0, 100);
     await syncFormBatch(batch);
   }, 30000);
   ```

2. **Background Job Queue**
   - Use Bull/BullMQ with Redis
   - Queue sync jobs, process in background worker
   - Better for serverless/edge deployments

3. **Periodic Full Sync**
   - Disable event-driven sync
   - Run `initialFullSync()` every 5-10 minutes via cron
   - Simpler, but higher latency

---

## Migration Notes

### From Auto-Sync (Polling)

1. Set `SHEETS_SYNC_ENABLED=false` to disable old polling service
2. Remove/comment out old `startAutoSync()` calls
3. Run initial sync to ensure data is current
4. Test form/payment submissions
5. Monitor logs for sync confirmations

### Rollback Plan

If event-driven sync has issues:

1. Set `SHEETS_SYNC_ENABLED=false`
2. Re-enable old polling service
3. File issue with error logs
4. Old code remains in place for easy rollback

---

## Code Quality

### Type Safety
✅ All functions have explicit return types  
✅ Interfaces defined for all data structures  
✅ No `any` types in sync code  

### Error Handling
✅ Try-catch in all async functions  
✅ Non-blocking sync (user operations never fail)  
✅ Retry logic for transient errors  
✅ Descriptive error messages  

### Maintainability
✅ Centralized configuration (`SHEET_CONFIGS`)  
✅ Clear function names and comments  
✅ Consistent logging format  
✅ Feature flag for easy disabling  

### Testing
🔲 Unit tests (recommended)  
🔲 Integration tests (recommended)  
✅ Manual testing with curl commands  

---

## Future Enhancements

### Potential Improvements

1. **Delete Handling**
   - Add handlers for form/payment deletions
   - Remove rows from sheet when records are deleted

2. **Batch API**
   - Endpoint to sync multiple items at once
   - Useful for backfills or bulk operations

4. **Webhooks**
   - Notify external systems when sync completes
   - Useful for integrating with other services

5. **Analytics**
   - Track sync success/failure rates
   - Monitor API quota usage
   - Alert on repeated failures

---

## Support

### Need Help?

1. **Check Status**: `GET /api/sync/event`
2. **Review Logs**: Look for `[Sheets]` and `[Sheets API]` prefixes
3. **Test Manually**: Run initial sync and check response
4. **Verify Credentials**: Ensure service account has access
5. **Check Quotas**: Google Sheets API has rate limits

### Common Questions

**Q: Can I use a different sheet for each university?**  
A: Yes, modify `SHEET_CONFIGS` to include university-specific sheet names.

**Q: What happens if Google Sheets API is down?**  
A: Syncs fail silently, user submissions succeed. Run initial sync when API recovers.

**Q: Can I sync to multiple spreadsheets?**  
A: Yes, modify `createSheetsClient()` to accept a spreadsheet ID parameter.

**Q: How do I test without affecting production sheet?**  
A: Use a different `GOOGLE_SHEET_ID` for development/staging.

---

## License

Same as parent project.

---

**Last Updated:** November 2025  
**Version:** 2.0 (Event-Driven)
