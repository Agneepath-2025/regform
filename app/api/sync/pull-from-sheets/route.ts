import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { google } from "googleapis";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";

/**
 * POST /api/sync/pull-from-sheets
 * 
 * Pulls data from Google Sheets and updates MongoDB
 * This enables bidirectional sync - admin portal reads back changes from sheets
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { sheetName = "**Finance (Do Not Open)**", collection = "payments" } = body;

    console.log(`📥 Pulling data from sheet "${sheetName}" to collection "${collection}"...`);

    // Authenticate with Google Sheets API
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
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

    const googleAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth: googleAuth });

    // Read data from sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return NextResponse.json({
        success: true,
        message: "No data to pull from sheet",
        updated: 0
      });
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log(`📊 Found ${dataRows.length} rows in sheet "${sheetName}"`);

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const targetCollection = db.collection(collection);

    let updatedCount = 0;
    let notFoundCount = 0;

    // Process based on collection type
    if (collection === "payments") {
      // Payment ID is in column D (index 3)
      const paymentIdIndex = 3;
      const statusIndex = headers.findIndex(h => String(h).toLowerCase().includes('status'));
      const sendEmailIndex = headers.findIndex(h => String(h).toLowerCase().includes('send email'));

      for (const row of dataRows) {
        const paymentId = row[paymentIdIndex];
        
        if (!paymentId || !ObjectId.isValid(paymentId)) {
          continue;
        }

        const updateData: Record<string, unknown> = {};
        
        // Update status if changed
        if (statusIndex >= 0 && row[statusIndex]) {
          updateData.registrationStatus = row[statusIndex];
        }

        // Update sendEmail if changed
        if (sendEmailIndex >= 0 && row[sendEmailIndex]) {
          updateData.sendEmail = String(row[sendEmailIndex]).toLowerCase() === 'yes';
        }

        if (Object.keys(updateData).length > 0) {
          const result = await targetCollection.updateOne(
            { _id: new ObjectId(paymentId) },
            { $set: { ...updateData, updatedAt: new Date() } }
          );

          if (result.matchedCount > 0) {
            updatedCount++;
          } else {
            notFoundCount++;
          }
        }
      }
    } else if (collection === "users") {
      // Email is in column B (index 1)
      const emailIndex = 1;
      const emailVerifiedIndex = headers.findIndex(h => String(h).toLowerCase().includes('email verified'));
      const registrationDoneIndex = headers.findIndex(h => String(h).toLowerCase().includes('registration done'));
      const paymentDoneIndex = headers.findIndex(h => String(h).toLowerCase().includes('payment done'));

      for (const row of dataRows) {
        const email = row[emailIndex];
        
        if (!email) {
          continue;
        }

        const updateData: Record<string, unknown> = {};
        
        if (emailVerifiedIndex >= 0 && row[emailVerifiedIndex]) {
          updateData.emailVerified = String(row[emailVerifiedIndex]).toLowerCase() === 'yes';
        }

        if (registrationDoneIndex >= 0 && row[registrationDoneIndex]) {
          updateData.registrationDone = String(row[registrationDoneIndex]).toLowerCase() === 'yes';
        }

        if (paymentDoneIndex >= 0 && row[paymentDoneIndex]) {
          updateData.paymentDone = String(row[paymentDoneIndex]).toLowerCase() === 'yes';
        }

        if (Object.keys(updateData).length > 0) {
          const result = await targetCollection.updateOne(
            { email: email },
            { $set: { ...updateData, updatedAt: new Date() } }
          );

          if (result.matchedCount > 0) {
            updatedCount++;
          } else {
            notFoundCount++;
          }
        }
      }
    }

    console.log(`✅ Pull sync completed: ${updatedCount} updated, ${notFoundCount} not found`);

    return NextResponse.json({
      success: true,
      message: `Successfully pulled and updated ${updatedCount} records`,
      updated: updatedCount,
      notFound: notFoundCount
    });

  } catch (error) {
    console.error("❌ Error pulling from sheets:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to pull from sheets"
      },
      { status: 500 }
    );
  }
}
