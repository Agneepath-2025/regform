# Auto-Sync to Google Sheets (Every 5 Seconds)

This feature automatically syncs your MongoDB collections to Google Sheets every 5 seconds.

---

## 🚀 Quick Start

### 1. Configure Google Sheets (One-Time Setup)

Follow the main setup guide in `GOOGLE_SHEETS_SETUP.md` to:
- Create a Google Cloud service account
- Get credentials (JSON file)
- Share your Google Sheet with the service account

### 2. Add Environment Variables

Add to your `.env.local`:

```env
# Google Sheets credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_spreadsheet_id



```

### 3. Restart Your Server

```bash
npm run dev
```

**That's it!** The sync will start automatically and run every 5 seconds.

---

## 📊 What Gets Synced

The service syncs these collections to separate sheets:

| MongoDB Collection | Google Sheet Tab | Update Frequency |
|-------------------|------------------|------------------|
| `form` | Sheet1 | Every 5 seconds |
| `users` | Users | Every 5 seconds |
| `payments` | Payments | Every 5 seconds |

---

## 🎛️ Control the Service

### Check Status

```bash
curl http://localhost:3000/api/sync/auto
```

Response:
```json
{
  "success": true,
  "isRunning": true,
  "currentlyProcessing": false,
  "configs": [
    { "collection": "form", "sheetName": "Sheet1" },
    { "collection": "users", "sheetName": "Users" },
    { "collection": "payments", "sheetName": "Payments" }
  ]
}
```

### Start Manually

```bash
curl -X POST http://localhost:3000/api/sync/auto \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### Stop the Service

```bash
curl -X POST http://localhost:3000/api/sync/auto \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

---

## 📝 Server Logs

When the server starts, you'll see:

```
[Instrumentation] Server started, initializing auto-sync...
[Sync] 🚀 Starting auto-sync service (every 5 seconds)...
[Sync] Starting sync at 10:30:15...
[Sync] form → Sheet1: 42 records
[Sync] users → Users: 15 records
[Sync] payments → Payments: 8 records
[Sync] Completed at 10:30:16
```

Every 5 seconds:
```
[Sync] Starting sync at 10:30:20...
[Sync] form → Sheet1: 42 records
[Sync] users → Users: 15 records
[Sync] payments → Payments: 8 records
[Sync] Completed at 10:30:21
```

---

## ⚙️ Configuration

### Change Sync Interval

Edit `app/utils/sheets-sync-service.ts`:

```typescript
// Change from 5000 (5 seconds) to your desired interval
syncInterval = setInterval(() => {
  performSync();
}, 5000); // milliseconds
```

### Add/Remove Collections

Edit `app/utils/sheets-sync-service.ts`:

```typescript
const syncConfigs: SyncConfig[] = [
  { collection: "form", sheetName: "Sheet1" },
  { collection: "users", sheetName: "Users" },
  { collection: "payments", sheetName: "Payments" },
  // Add more:
  // { collection: "registrations", sheetName: "Registrations" },
];
```

### Disable Auto-Start

In `.env.local`:

```env
AUTO_SYNC_ENABLED=false
```

Or remove the variable entirely. You can still start it manually via the API.

---

## 🔧 How It Works

1. **Server Start**: Next.js loads `instrumentation.ts` automatically
2. **Initialization**: After 3 seconds (allows MongoDB to connect), starts the sync service
3. **Sync Loop**: Every 5 seconds:
   - Fetches all documents from each MongoDB collection
   - Formats data into rows and columns
   - Clears the Google Sheet
   - Writes new data
   - Formats headers (bold + gray background)
4. **Prevents Overlaps**: If previous sync is still running, skips the next cycle

---

## 🛡️ Production Considerations

### Performance Impact

- **5-second interval is aggressive** for production
- Consider increasing to 30-60 seconds for production:
  ```typescript
  }, 30000); // 30 seconds
  ```

### Rate Limits

Google Sheets API has quotas:
- **Read/Write requests**: 500 per 100 seconds per project
- **Read/Write requests**: 100 per 100 seconds per user

At 5-second intervals with 3 collections:
- ~36 requests/minute = **~2,160 requests/hour**
- Well within quota, but monitor if you add more collections

### Recommendations

For production:
1. **Increase interval** to 30-60 seconds
2. **Add throttling** if API errors occur
3. **Use Vercel Cron** instead for scheduled syncs (every 5-15 minutes)
4. **Monitor logs** for sync failures

---

## 🐛 Troubleshooting

### "Auto-sync disabled" message

Check `.env.local`:
```env
AUTO_SYNC_ENABLED=true
```

Restart server after changes.

### "GOOGLE_SHEET_ID not configured"

Ensure all three variables are set:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

### Sync errors in logs

Common issues:
- Sheet not shared with service account
- Invalid credentials
- Sheet tab names don't match (`Sheet1`, `Users`, `Payments`)

### High CPU usage

The 5-second interval can be intensive. Consider:
- Increasing interval to 30+ seconds
- Only syncing changed data (requires tracking)
- Using webhooks/triggers instead of polling

---

## 🎯 Alternative: Vercel Cron (Recommended for Production)

Instead of continuous syncing, use Vercel's cron jobs:

Create `app/api/cron/sync-sheets/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { startAutoSync } from "@/app/utils/sheets-sync-service";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Trigger one-time sync
  // ... sync logic here

  return NextResponse.json({ success: true });
}
```

In `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/sync-sheets",
    "schedule": "*/5 * * * *"
  }]
}
```

This runs every 5 minutes without keeping a process running.

---

## ✅ Files Created

- `app/utils/sheets-sync-service.ts` - Core sync logic
- `app/api/sync/auto/route.ts` - Control API
- `instrumentation.ts` - Auto-start on server init
- `next.config.ts` - Enabled instrumentation hook

---

## 📚 See Also

- **Setup Guide**: `GOOGLE_SHEETS_SETUP.md`
- **Manual Sync API**: `app/api/sync/sheets/route.ts`
- **Next.js Instrumentation**: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
