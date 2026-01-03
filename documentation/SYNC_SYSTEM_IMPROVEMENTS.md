# Sync System Fixes & Bidirectional Sync Implementation

## Summary of Changes

### Issues Fixed

1. **Environment Variable Inconsistencies**
   - Fixed all sync endpoints to support both `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_CLIENT_EMAIL`
   - Added proper fallbacks for credentials across all sync routes
   - Ensured `.env.production` values are properly used

2. **Sync Reliability**
   - Added proper error handling and validation for Google credentials
   - Improved authentication flow in all sync endpoints
   - Fixed credential initialization order issues

### New Features Added

1. **Bidirectional Sync (Pull from Sheets)**
   - New endpoint: `/api/sync/pull-from-sheets`
   - Pulls data FROM Google Sheets back TO MongoDB
   - Supports both `payments` and `users` collections
   - Matches records by Payment ID (column D) or Email (column B)
   - Updates: `registrationStatus`, `sendEmail`, `emailVerified`, `registrationDone`, `paymentDone`

2. **Admin Dashboard Sync Controls**
   - **Pull from Sheets** button: Downloads latest changes from Google Sheets
   - **Push to Sheets** button: Uploads local changes to Google Sheets
   - Auto-sync on dashboard load
   - Real-time sync status messages
   - Last sync timestamp display

3. **Auto-Sync on Load**
   - Dashboard automatically pulls from sheets when loaded
   - Ensures admin portal always has latest data from sheets
   - Silent background operation with error handling

## Files Modified

### API Routes
- `/app/api/sync/incremental/route.ts` - Fixed credentials
- `/app/api/sync/sheets/route.ts` - Fixed credentials
- `/app/api/sync/due-payments/route.ts` - Fixed credentials
- `/app/api/sync/pull-from-sheets/route.ts` - **NEW** - Bidirectional sync endpoint

### Utilities
- `/app/utils/incremental-sync.ts` - Fixed credentials

### Frontend
- `/app/admin/dashboard.tsx` - Added sync buttons, state management, and auto-pull

## How to Use

### Manual Sync (Admin Dashboard)

1. **Pull from Sheets** (Download changes)
   - Click "Pull from Sheets" button in the header
   - Updates local database with changes made in Google Sheets
   - Use when someone edits data directly in sheets

2. **Push to Sheets** (Upload changes)
   - Click "Push to Sheets" button in the header
   - Sends all local database changes to Google Sheets
   - Use after making changes in admin portal

### Automatic Sync

- **On Dashboard Load**: Automatically pulls from sheets when admin portal loads
- **On Edit**: Changes made in admin portal automatically sync to sheets via incremental sync
- **Auto-refresh**: Dashboard refreshes every 2 seconds to show latest data

## Sync Flow

### Push (Portal → Sheets)
```
Admin Edit → MongoDB → Incremental Sync → Google Sheets
```
- Triggered automatically on every edit
- Uses `/api/sync/incremental` endpoint
- Updates specific row in real-time

### Pull (Sheets → Portal)
```
Google Sheets → Pull Sync → MongoDB → Dashboard Refresh
```
- Triggered on dashboard load or manual button click
- Uses `/api/sync/pull-from-sheets` endpoint
- Updates multiple records in batch

## Environment Variables Required

Ensure these are set in `.env.production`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=agneepath-sheets-api@agneepath-sheets-api.iam.gserviceaccount.com
GOOGLE_CLIENT_EMAIL=agneepath-sheets-api@agneepath-sheets-api.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEET_ID=1BHa8wHt6eQVUSquqmuCvTxh9oWfE8JTq70wggLpvZF8
```

Note: Both `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_CLIENT_EMAIL` are supported.

## Troubleshooting

### Sync Not Working

1. **Check Credentials**
   ```bash
   # In terminal on server
   echo $GOOGLE_SERVICE_ACCOUNT_EMAIL
   echo $GOOGLE_SHEET_ID
   ```

2. **Check Logs**
   - Look for "📊", "✅", or "❌" emoji in server logs
   - Check for authentication errors

3. **Manual Test**
   ```bash
   curl -X POST https://register.agneepath.co.in/api/sync/pull-from-sheets \
     -H "Content-Type: application/json" \
     -d '{"sheetName": "**Finance (Do Not Open)**", "collection": "payments"}'
   ```

### Common Issues

1. **"Google Sheets credentials not configured"**
   - Check environment variables are set correctly
   - Ensure private key has proper newline characters

2. **"Record not found"**
   - Payment ID or Email doesn't match
   - Check column positions in sheet (Payment ID = column D, Email = column B)

3. **Sync button disabled**
   - Another sync is in progress
   - Wait for current operation to complete

## Sheet Column Mapping

### Payments Sheet ("**Finance (Do Not Open)**")
- Column D: Payment ID (used for matching)
- Column with "status": Registration Status
- Column with "send email": Send Email flag

### Users Sheet
- Column B: Email (used for matching)
- Column with "email verified": Email Verified flag
- Column with "registration done": Registration Done flag
- Column with "payment done": Payment Done flag

## API Endpoints

### Pull from Sheets
```
POST /api/sync/pull-from-sheets
Body: {
  "sheetName": "**Finance (Do Not Open)**",
  "collection": "payments"
}
```

### Push to Sheets
```
POST /api/sync/sheets
Body: {
  "sheetName": "**Finance (Do Not Open)**",
  "collection": "payments"
}
```

### Incremental Sync (Auto)
```
POST /api/sync/incremental
Body: {
  "collection": "payments",
  "recordId": "ObjectId",
  "sheetName": "**Finance (Do Not Open)**"
}
```

## Benefits

1. **Bidirectional**: Changes flow both ways automatically
2. **Real-time**: Edits in portal sync instantly
3. **Consistent**: Dashboard always shows latest data
4. **Reliable**: Error handling and retry logic
5. **Transparent**: Visual feedback for all operations

## Notes

- Pull sync runs automatically on dashboard load
- Push sync happens automatically on every edit
- Manual buttons available for forced sync
- All operations are logged with emoji indicators
- Sync status shown in dashboard header
