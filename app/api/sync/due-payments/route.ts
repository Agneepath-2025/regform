import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * POST /api/sync/due-payments
 * 
 * Syncs due payments data to Google Sheets "Due Payments" tab
 * Includes unpaid, unverified, pending, and overpaid records
 */
export async function POST(req: NextRequest) {
  try {
    console.log("📊 Syncing due payments to Google Sheets...");

    // Fetch due payments from the admin API
    const baseUrl = process.env.NEXTAUTH_URL || process.env.ROOT_URL || 'http://localhost:3000';
    const duePaymentsResponse = await fetch(`${baseUrl}/api/admin/due-payments`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!duePaymentsResponse.ok) {
      throw new Error('Failed to fetch due payments');
    }

    const duePaymentsResult = await duePaymentsResponse.json();
    const duePayments = duePaymentsResult.data || [];

    console.log(`📊 Found ${duePayments.length} due payment records to sync`);

    const duePaymentsData: unknown[][] = [];

    // Format all due payments for Google Sheets
    for (const duePayment of duePayments) {
      const currentDate = new Date();
      const date = currentDate.toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const time = currentDate.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Format sports with changes
      const sportsModified = duePayment.forms.map((form: { sport: string; difference: number }) => 
        `${form.sport} (${form.difference > 0 ? '+' : ''}${form.difference})`
      ).join(', ');

      duePaymentsData.push([
        date,
        time,
        duePayment.userName || 'N/A',
        duePayment.userEmail || 'N/A',
        duePayment.universityName || 'N/A',
        duePayment.transactionId || 'No Payment',
        sportsModified,
        duePayment.originalPlayerCount.toString(),
        duePayment.currentPlayerCount.toString(),
        duePayment.playerDifference.toString(),
        duePayment.amountDue.toString(),
        duePayment.status || 'pending',
        duePayment.resolutionStatus || 'pending'
      ]);
    }

    // Authenticate with Google Sheets API
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey) {
      console.error("❌ Missing Google credentials");
      return NextResponse.json(
        { success: false, message: "Google Sheets credentials not configured" },
        { status: 500 }
      );
    }

    if (!spreadsheetId) {
      console.error("❌ Missing GOOGLE_SHEET_ID");
      return NextResponse.json(
        { success: false, message: "Google Sheet ID not configured" },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetName = "Due Payments";

    // Check if sheet exists, create if not
    try {
      const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetExists = sheetMetadata.data.sheets?.some(
        sheet => sheet.properties?.title === sheetName
      );

      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: { title: sheetName }
              }
            }]
          }
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:M1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[
              "Date", "Time", "User Name", "Email", "University", "Transaction ID",
              "Sports Modified", "Original Players", "Current Players", "Player Difference",
              "Amount Due (₹)", "Payment Status", "Resolution Status"
            ]]
          }
        });
      }
    } catch (error) {
      console.error("Error checking/creating sheet:", error);
    }

    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A2:M`,
    });

    // Write new data
    if (duePaymentsData.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'RAW',
        requestBody: {
          values: duePaymentsData
        }
      });
    }

    console.log(`✅ Synced ${duePaymentsData.length} due payment records to Google Sheets`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${duePaymentsData.length} due payment records`,
      count: duePaymentsData.length
    });

  } catch (error) {
    console.error("❌ Error syncing due payments:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to sync"
      },
      { status: 500 }
    );
  }
}
