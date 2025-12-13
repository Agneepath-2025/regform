# Registration Confirmation System Setup Guide

This guide explains how to set up the registration confirmation workflow in Google Sheets with automatic email triggering.

## Overview

The **Finance (Do Not Open)** sheet has two dropdown columns for managing registrations:
- **Status** (Column N): Track payment/registration status (Confirmed, Rejected, In Progress, Not Started)
- **Send Email?** (Column O): Trigger confirmation emails to registrants (Yes, No)

When "Send Email?" is changed to "Yes", the system automatically sends a registration confirmation email using the payment-confirmed.html template.

## 1. Dropdown Columns Setup

After deploying the updated code, both dropdown columns will appear automatically with these defaults:

- **Status**: Default value is "Not Started"
  - Options: Confirmed, Rejected, In Progress, Not Started
- **Send Email?**: Default value is "No"
  - Options: Yes, No

### Automatic Configuration

The dropdowns are automatically configured during the initial sync. If you need to manually add or fix them:

**For "Status" (Column N):**
1. Select column N starting from row 2 (N2:N)
2. Click **Data** → **Data validation**
3. Set criteria to: List of items
4. Values: `Confirmed, Rejected, In Progress, Not Started`
5. Check "Show dropdown list in cell" and "Reject input"
6. Click **Save**

**For "Send Email?" (Column O):**
1. Select column O starting from row 2 (O2:O)
2. Click **Data** → **Data validation**
3. Set criteria to: List of items
4. Values: `Yes, No`
5. Check "Show dropdown list in cell" and "Reject input"
6. Click **Save**

### Optional: Add Conditional Formatting (Colors)

**For "Status" Column (N):**

1. Select N2:N
2. Click **Format** → **Conditional formatting**
3. Add these rules:

**Confirmed (Light Green):**
- Format cells if: **Text is exactly** `Confirmed`
- Background color: `#d9ead3`

**Rejected (Light Red):**
- Format cells if: **Text is exactly** `Rejected`
- Background color: `#f4cccc`

**In Progress (Yellow):**
- Format cells if: **Text is exactly** `In Progress`
- Background color: `#fff2cc`

**Not Started (Light Gray):**
- Format cells if: **Text is exactly** `Not Started`
- Background color: `#e0e0e0`

**For "Send Email?" Column (O):**

1. Select O2:O
2. Add conditional formatting:

**Yes (Light Green):**
- Format cells if: **Text is exactly** `Yes`
- Background color: `#d9ead3`

**No (Light Red):**
- Format cells if: **Text is exactly** `No`
- Background color: `#f4cccc`

## 2. Set Up Google Apps Script Trigger

To automatically send confirmation emails when "Send Email?" is changed to "Yes":

### Step 1: Open Script Editor
1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code
3. Paste the following script:

```javascript
/**
 * Webhook URL - Replace with your actual production URL
 */
const WEBHOOK_URL = "https://register.agneepath.co.in/api/payments/verify";

/**
 * Name of the sheet to monitor
 */
const SHEET_NAME = "**Finance (Do Not Open)**";

/**
 * Column index for "Send Email?" (O = 15)
 */
const SEND_EMAIL_COLUMN = 15;

/**
 * Column index for "Payment ID" (D = 4)
 */
const PAYMENT_ID_COLUMN = 4;

/**
 * Trigger function that runs on every edit
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  
  // Only process edits in the Finance sheet
  if (sheet.getName() !== SHEET_NAME) {
    return;
  }
  
  const range = e.range;
  const row = range.getRow();
  const column = range.getColumn();
  
  // Only process edits to the "Send Email?" column (skip header row)
  if (column !== SEND_EMAIL_COLUMN || row === 1) {
    return;
  }
  
  const newValue = range.getValue();
  
  // Only trigger webhook when changed to "Yes"
  if (newValue !== "Yes") {
    Logger.log(`Send Email changed to "${newValue}" - no email triggered`);
    return;
  }
  
  // Get the Payment ID from the same row
  const paymentId = sheet.getRange(row, PAYMENT_ID_COLUMN).getValue();
  
  if (!paymentId) {
    Logger.log("No Payment ID found in row " + row);
    return;
  }
  
  // Call the webhook
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        paymentId: paymentId,
        sendEmail: newValue
      }),
      muteHttpExceptions: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode === 200) {
      Logger.log("✅ Registration confirmation email sent for payment: " + paymentId);
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "Registration confirmation email sent successfully!", 
        "Email Sent", 
        3
      );
    } else {
      Logger.log("❌ Webhook failed: " + statusCode + " - " + responseText);
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "Failed to send email. Check logs.", 
        "Error", 
        5
      );
    }
  } catch (error) {
    Logger.log("❌ Error calling webhook: " + error);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Error: " + error, 
      "Webhook Failed", 
      5
    );
  }
}

/**
 * Test function to manually trigger webhook
 * Run this to test without changing the sheet
 */
function testWebhook() {
  const testPaymentId = "YOUR_TEST_PAYMENT_ID"; // Replace with actual payment ID
  
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        paymentId: testPaymentId,
        sendEmail: "Yes"
      }),
      muteHttpExceptions: true
    });
    
    Logger.log("Status: " + response.getResponseCode());
    Logger.log("Response: " + response.getContentText());
  } catch (error) {
    Logger.log("Error: " + error);
  }
}
```

### Step 2: Save and Test
1. Click the disk icon or **Ctrl+S** to save
2. Name your project: "Registration Confirmation Trigger"
3. To test:
   - Update `testPaymentId` in the `testWebhook()` function with a real payment ID
   - Select `testWebhook` from the function dropdown
   - Click **Run**
   - Authorize the script when prompted
   - Check logs: **View** → **Logs**

### Step 3: Deploy
The script will automatically run when you edit the "Send Email?" column. No additional triggers needed - it uses the built-in `onEdit` trigger.

## 3. Workflow

### Registration Process:

1. **Payment submitted** → Row added to sheet with:
   - Status: "Not Started"
   - Send Email?: "No"

2. **Admin reviews payment** → Updates Status dropdown:
   - "Confirmed" - Payment verified and accepted
   - "Rejected" - Payment issues or declined
   - "In Progress" - Currently being reviewed
   - "Not Started" - Awaiting review

3. **Admin confirms registration** → Changes "Send Email?" to "Yes":
   - Apps Script detects the change
   - Calls `/api/payments/verify` webhook
   - Webhook fetches payment and user details
   - Sends `payment-confirmed.html` email to registrant

4. **User receives** → Registration confirmation email with:
   - Payment details (transaction ID, amount, date)
   - Registered sports/events
   - Number of players per sport
   - Agneepath event information

### Important Notes:
- **Status** column is for internal tracking only - does NOT trigger emails
- **Send Email?** column triggers the confirmation email when set to "Yes"
- Once email is sent, you can leave "Send Email?" as "Yes" or change back to "No"
- The system prevents duplicate emails from being sent for the same payment

## 4. Manual Email Trigger (Alternative)

If you prefer not to use Apps Script, you can manually trigger emails via API:

```bash
curl -X POST https://register.agneepath.co.in/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "PAYMENT_ID_HERE", "sendEmail": "Yes"}'
```

## Troubleshooting

### Script not running?
- Make sure the script is saved
- Check that column numbers match (Payment ID = column 4, Send Email? = column 15)
- Verify sheet name is exactly "**Finance (Do Not Open)**"
- View execution logs: **Apps Script** → **Executions**

### Email not sent?
- Check Apps Script logs for webhook response
- Verify WEBHOOK_URL is correct (https://register.agneepath.co.in/api/payments/verify)
- Check server logs for API errors
- Ensure payment ID exists in database
- Verify user has valid email address

### Colors not showing?
- Reapply conditional formatting rules
- Make sure cell values exactly match dropdown options (case-sensitive)

### Dropdown not showing?
- Re-run initial sync to recreate data validation
- Manually add data validation following steps in section 1
