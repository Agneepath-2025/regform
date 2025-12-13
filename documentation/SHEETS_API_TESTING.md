# Testing Registration Confirmation System with a Separate Sheet

This guide explains how to safely test the registration confirmation workflow using a separate Google Sheet without affecting your production data.

## Overview

Testing with a separate sheet allows you to:
- Verify the email triggering system works correctly
- Test the Apps Script webhook integration
- Experiment with dropdown configurations
- Ensure the workflow is correct before deploying to production

## Prerequisites

- Google Service Account credentials (already set up for production)
- Access to create/manage Google Sheets
- Node.js environment with access to `.env` file

## Step 1: Create Test Sheet

### Option A: Duplicate Existing Sheet
1. Open your production Google Sheet
2. Right-click on the sheet tab at the bottom
3. Click **"Copy to"** → **"New spreadsheet"**
4. Name it: `Agneepath Registration Test Sheet`
5. Copy the new spreadsheet URL

### Option B: Create Fresh Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"Blank"** to create a new spreadsheet
3. Name it: `Agneepath Registration Test Sheet`
4. You'll populate it with test data using the initial sync

## Step 2: Get Test Sheet ID

From the sheet URL, extract the spreadsheet ID:
```
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
                                      ^^^^^^^^^^^^^^^^
```

Example:
```
URL: https://docs.google.com/spreadsheets/d/1abc123xyz789/edit
Spreadsheet ID: 1abc123xyz789
```

## Step 3: Share Sheet with Service Account

1. In your test sheet, click **Share** button (top-right)
2. Add your service account email (found in `credentials.json`):
   - Usually looks like: `your-service@project-id.iam.gserviceaccount.com`
3. Give it **Editor** access
4. Click **Done**

**To find your service account email:**
```bash
cd /Users/nitin/Documents/agneepath/regform
cat credentials.json | grep client_email
```

## Step 4: Update Environment Variables

### For Testing:
Create a separate environment file for testing or temporarily modify `.env`:

**Option A: Create `.env.test` file:**
```bash
# Copy production env
cp .env .env.test

# Edit the test env file
nano .env.test
```

Update only the `GOOGLE_SHEET_ID`:
```bash
# Replace with your test sheet ID
GOOGLE_SHEET_ID=YOUR_TEST_SPREADSHEET_ID_HERE

# Keep all other values the same
MONGODB_URI=mongodb://127.0.0.1:27017/production
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
# ... rest of your config
```

**Option B: Temporarily modify `.env`:**
```bash
# Backup production env
cp .env .env.production.backup

# Edit main .env file
nano .env
```

Replace the `GOOGLE_SHEET_ID` value with your test sheet ID.

> **⚠️ Important**: Remember to restore the production sheet ID before deploying!

## Step 5: Run Initial Sync with Test Sheet

With the test sheet ID in your environment:

```bash
# Navigate to regform directory
cd /Users/nitin/Documents/agneepath/regform

# Run the initial sync
# This will populate your test sheet with current MongoDB data
node -e "
const { initialFullSync } = require('./app/utils/sheets-event-sync.ts');
initialFullSync().then(result => {
  console.log('Sync Result:', result);
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Sync Error:', err);
  process.exit(1);
});
"
```

Or create a test script:

**Create `scripts/test-sync.js`:**
```javascript
const { initialFullSync } = require('../app/utils/sheets-event-sync.ts');

async function testSync() {
  console.log('🧪 Running test sync...');
  const result = await initialFullSync();
  
  if (result.success) {
    console.log('✅ Test sync completed successfully!');
    console.log('📊 Synced data:');
    console.log(`   - Forms: ${result.counts?.forms || 0}`);
    console.log(`   - Users: ${result.counts?.users || 0}`);
    console.log(`   - Payments: ${result.counts?.payments || 0}`);
  } else {
    console.error('❌ Test sync failed:', result.error);
  }
}

testSync();
```

Run it:
```bash
node scripts/test-sync.js
```

## Step 6: Set Up Apps Script on Test Sheet

1. Open your test Google Sheet
2. Click **Extensions** → **Apps Script**
3. Copy the script from [PAYMENT_VERIFICATION_SETUP.md](PAYMENT_VERIFICATION_SETUP.md) (Section 2)
4. **Important**: Update the `SHEET_NAME` to match your test sheet:

```javascript
// Update this line if your test sheet has a different name
const SHEET_NAME = "**Finance (Do Not Open)**";
```

5. For testing, you might want to add extra logging:

```javascript
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  
  Logger.log("Sheet edited: " + sheet.getName());
  
  if (sheet.getName() !== SHEET_NAME) {
    Logger.log("Not the Finance sheet, ignoring");
    return;
  }
  
  const range = e.range;
  const row = range.getRow();
  const column = range.getColumn();
  
  Logger.log("Row: " + row + ", Column: " + column);
  Logger.log("Send Email Column: " + SEND_EMAIL_COLUMN);
  
  // ... rest of the script
}
```

6. Save the script: **File** → **Save**
7. Name it: `Test Registration Confirmation Trigger`

## Step 7: Test the Workflow

### 7.1 Verify Sheet Structure
Check that your test sheet has:
- ✅ Three tabs: "Registrations", "Users", "**Finance (Do Not Open)**"
- ✅ Finance tab has columns: Status (N), Send Email? (O)
- ✅ All rows have default values: Status="Not Started", Send Email?="No"
- ✅ Dropdowns are working on both columns

### 7.2 Test Email Trigger

1. Pick a test payment row (with a real user email you can access)
2. Change "Send Email?" from "No" to "Yes"
3. Watch for the toast notification: "Registration confirmation email sent successfully!"
4. Check the email inbox
5. Check Apps Script logs: **Apps Script** → **Executions**

### 7.3 Test Different Scenarios

**Test Case 1: Valid Payment**
- Select a row with valid Payment ID
- Change Send Email? to "Yes"
- ✅ Should receive confirmation email

**Test Case 2: Invalid Payment ID**
- Manually edit a Payment ID to something fake
- Change Send Email? to "Yes"
- ❌ Should see error in Apps Script logs

**Test Case 3: Multiple Changes**
- Change Status dropdown (should NOT trigger email)
- Change Send Email? to "Yes" (should trigger email)
- Change Send Email? back to "No" (should NOT trigger email)

**Test Case 4: Manual Webhook Call**
```bash
# Test the webhook directly
curl -X POST https://register.agneepath.co.in/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "REAL_PAYMENT_ID_FROM_SHEET",
    "sendEmail": "Yes"
  }'
```

## Step 8: Monitor and Debug

### Check Apps Script Logs
1. In Apps Script editor: **View** → **Logs** (legacy)
2. Or: **View** → **Executions** (new)
3. Look for:
   - ✅ "Registration confirmation email sent for payment: ..."
   - ❌ "Webhook failed: ..." (if there's an error)

### Check Server Logs
If using PM2 or direct node:
```bash
# PM2 logs
pm2 logs regform

# Or check application logs
tail -f /path/to/your/app/logs/app.log
```

### Common Issues

**Issue: No email sent**
- Check Apps Script execution logs
- Verify webhook URL is correct
- Check server is running: `curl https://register.agneepath.co.in/api/health`
- Verify payment ID exists in MongoDB
- Check nodemailer configuration in `.env`

**Issue: Dropdowns not showing**
- Re-run initial sync
- Check data validation was applied (Data → Data validation)
- Manually add validation if needed

**Issue: "Permission denied" on sheet**
- Verify service account has Editor access to test sheet
- Check `GOOGLE_SERVICE_ACCOUNT_EMAIL` in `.env`
- Ensure `credentials.json` is in the correct location

## Step 9: Switch Back to Production

### When Testing is Complete:

**If using `.env.test`:**
```bash
# Simply don't use the test env file
# Your production .env is untouched
```

**If you modified `.env`:**
```bash
# Restore production configuration
cp .env.production.backup .env

# Or manually update GOOGLE_SHEET_ID back to production value
nano .env
```

**Verify production sheet ID:**
```bash
grep GOOGLE_SHEET_ID .env
```

**Test production connection:**
```bash
# Should show your production sheet data
node scripts/test-sync.js
```

## Step 10: Deploy to Production

Once testing is successful:

1. ✅ Verify all emails are being sent correctly
2. ✅ Confirm dropdown options match requirements
3. ✅ Test Apps Script works on production sheet
4. ✅ Update `.env` with production `GOOGLE_SHEET_ID`
5. ✅ Restart your application:
   ```bash
   pm2 restart regform
   # or
   npm run build && npm start
   ```

6. ✅ Run initial sync on production sheet:
   ```bash
   node scripts/test-sync.js
   ```

7. ✅ Set up Apps Script on production sheet (same as test)

## Best Practices

### Always Test First
- ✅ Never deploy major changes directly to production
- ✅ Use test sheet to verify all functionality
- ✅ Test with real payment data (small subset)
- ✅ Verify emails go to test addresses first

### Keep Test Sheet
- Keep your test sheet for future testing
- Use it to test formula changes, new features
- Update it periodically with fresh data from production

### Environment Management
```bash
# Create a script to switch environments
# scripts/switch-env.sh
#!/bin/bash

if [ "$1" == "test" ]; then
  cp .env.test .env
  echo "✅ Switched to TEST environment"
elif [ "$1" == "prod" ]; then
  cp .env.production .env
  echo "✅ Switched to PRODUCTION environment"
else
  echo "Usage: ./switch-env.sh [test|prod]"
fi
```

Make it executable:
```bash
chmod +x scripts/switch-env.sh

# Usage:
./scripts/switch-env.sh test
./scripts/switch-env.sh prod
```

## Cleanup

When you're done testing and confident in production:

### Delete Test Sheet (Optional)
1. Open Google Drive
2. Find "Agneepath Registration Test Sheet"
3. Right-click → **Remove**

### Remove Test Environment Files
```bash
rm .env.test
rm .env.production.backup
```

## Quick Reference

### Test Environment Setup
```bash
# 1. Create test sheet → Get ID
# 2. Share with service account
# 3. Update .env
echo "GOOGLE_SHEET_ID=YOUR_TEST_ID" >> .env.test

# 4. Run sync
node scripts/test-sync.js

# 5. Set up Apps Script on test sheet
# 6. Test workflow
```

### Switch to Production
```bash
# Update .env with production sheet ID
nano .env

# Verify
grep GOOGLE_SHEET_ID .env

# Restart app
pm2 restart regform
```

## Need Help?

If you encounter issues during testing:
1. Check Apps Script execution logs
2. Verify service account permissions
3. Check server logs for API errors
4. Ensure MongoDB connection is working
5. Verify nodemailer configuration

For more details on the registration confirmation system, see [PAYMENT_VERIFICATION_SETUP.md](PAYMENT_VERIFICATION_SETUP.md).
