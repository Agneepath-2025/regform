# Registration Status Sync Fix

## Problem
When verifying a payment in the admin portal, the payment `status` field was being updated (e.g., "verified", "pending", "rejected"), but the Google Sheets "Status" dropdown column (with values "Not Started", "Confirmed", "Rejected", "In Progress") was not being updated automatically.

## Solution
Added a new `registrationStatus` field to payment documents that maps to the Google Sheets Status dropdown:

### Field Mapping

| Payment Status (DB) | Registration Status (Google Sheets) |
|---------------------|-------------------------------------|
| verified            | Confirmed                           |
| rejected            | Rejected                            |
| pending             | In Progress                         |
| (new submission)    | Not Started                         |

### Changes Made

1. **app/api/admin/payments/[id]/route.ts**
   - Added `registrationStatus` to allowed update fields
   - Automatically sets `registrationStatus` based on payment status:
     - `status === "verified"` → `registrationStatus = "Confirmed"`
     - `status === "rejected"` → `registrationStatus = "Rejected"`
     - `status === "pending"` → `registrationStatus = "In Progress"`

2. **app/api/payments/submit/route.ts**
   - New payment submissions now initialize with `registrationStatus: "Not Started"`
   - Updated `PaymentData` interface to include the field

3. **app/api/sync/incremental/route.ts**
   - Updated `formatPaymentRecord()` to include `registrationStatus` in Google Sheets sync
   - Column order now includes registration status after payment status

## Usage

### Admin Portal
When you change a payment toggle to "verified" in the admin portal:
1. Payment `status` field updates to "verified"
2. Payment `registrationStatus` automatically updates to "Confirmed"
3. Both fields sync to Google Sheets via incremental sync
4. User's `paymentDone` field updates to `true`

### Google Sheets
The "Status" dropdown column will now automatically update when you verify payments through the admin portal. You can still manually update it in Google Sheets if needed.

## Testing

To test the fix:
1. Go to admin portal → Payments tab
2. Change a payment status to "verified"
3. Check Google Sheets → The Status dropdown should change to "Confirmed"
4. Change payment status to "rejected"
5. Check Google Sheets → Status should change to "Rejected"

## Notes

- This fix is **backward compatible** - existing payment records without `registrationStatus` will default to "Not Started" in the sync
- The sync is non-blocking, so UI updates immediately while sheets sync in the background
- Manual status updates in Google Sheets will not be overwritten unless you change the payment status again in the admin portal
