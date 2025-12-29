import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface DuePaymentRecord {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  universityName: string;
  paymentId: string;
  transactionId: string;
  originalPlayerCount: number;
  currentPlayerCount: number;
  playerDifference: number;
  amountDue: number;
  status: string;
  lastUpdated: Date;
  resolutionStatus?: string;
  forms: Array<{
    formId: string;
    sport: string;
    originalPlayers: number;
    currentPlayers: number;
    difference: number;
  }>;
}

/**
 * POST /api/sync/due-payments
 * 
 * Syncs due payments data to Google Sheets "Due Payments" tab
 * Includes unpaid, unverified, pending, and overpaid records
 */
export async function POST(req: NextRequest) {
  try {
    console.log("📊 Syncing due payments to Google Sheets...");

    // Calculate due payments directly from database
    const { db } = await connectToDatabase();
    const paymentsCollection = db.collection("payments");
    const formsCollection = db.collection("form");
    const usersCollection = db.collection("users");
    const duePaymentsCollection = db.collection("duePayments");

    const duePayments: DuePaymentRecord[] = [];

    // PART 1: Track verified payments with player count changes
    const payments = await paymentsCollection
      .find({ status: "verified" })
      .toArray();

    for (const payment of payments) {
      const snapshot = payment.baselineSnapshot || {};
      const forms = await formsCollection
        .find({ paymentId: payment._id.toString() })
        .toArray();

      // Skip if no baseline snapshot exists - means payment was just verified with current count
      if (!payment.baselineSnapshot || Object.keys(snapshot).length === 0) {
        continue;
      }

      let totalOriginal = 0;
      let totalCurrent = 0;
      const formDetails = [];
      let hasChanges = false;

      for (const form of forms) {
        const fields = form.fields as Record<string, unknown> | undefined;
        const playerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
        const originalCount = snapshot[form._id.toString()];
        
        // If this form wasn't in the snapshot, skip it (it's new after payment)
        if (originalCount === undefined) {
          continue;
        }
        
        const currentCount = playerFields.length;
        const difference = currentCount - originalCount;

        totalOriginal += originalCount;
        totalCurrent += currentCount;

        if (difference !== 0) {
          hasChanges = true;
          formDetails.push({
            formId: form._id.toString(),
            sport: form.sport || form.title,
            originalPlayers: originalCount,
            currentPlayers: currentCount,
            difference,
          });
        }
      }

      const playerDifference = totalCurrent - totalOriginal;

      // Only add to due payments if there are actual changes
      if (hasChanges && playerDifference !== 0) {
        const user = await usersCollection.findOne({
          _id: new ObjectId(payment.ownerId),
        });

        // Get resolution status
        const duePaymentRecord = await duePaymentsCollection.findOne({
          recordId: payment._id.toString(),
        });

        duePayments.push({
          _id: payment._id.toString(),
          userId: payment.ownerId,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "Unknown",
          universityName: user?.university || "Unknown",
          paymentId: payment._id.toString(),
          transactionId: payment.transactionId || "N/A",
          originalPlayerCount: totalOriginal,
          currentPlayerCount: totalCurrent,
          playerDifference,
          amountDue: playerDifference * 800,
          status: playerDifference > 0 ? "pending" : "overpaid",
          lastUpdated: payment.updatedAt || payment.createdAt || new Date(),
          resolutionStatus: duePaymentRecord?.resolutionStatus || "pending",
          forms: formDetails,
        });
      }
    }

    // PART 2 & 3: Track unpaid and unverified registrations
    // Get all forms and group by owner
    const allForms = await formsCollection.find({}).toArray();
    const formsByOwner = new Map<string, typeof allForms>();
    
    for (const form of allForms) {
      if (!form.ownerId) continue;
      const ownerIdStr = form.ownerId.toString();
      if (!formsByOwner.has(ownerIdStr)) {
        formsByOwner.set(ownerIdStr, []);
      }
      formsByOwner.get(ownerIdStr)!.push(form);
    }

    const processedUserIds = new Set(payments.map(p => p.ownerId?.toString() || p.ownerId));

    for (const [ownerIdStr, userForms] of formsByOwner.entries()) {
      // Skip if already processed in verified payments with changes
      if (processedUserIds.has(ownerIdStr)) continue;

      const ownerId = new ObjectId(ownerIdStr);
      
      // Get user details
      const user = await usersCollection.findOne({ _id: ownerId });
      if (!user) continue;

      // Get user's payment status - try both string and ObjectId formats
      const userPayment = await paymentsCollection.findOne({
        $or: [
          { ownerId: ownerIdStr },
          { ownerId: ownerId }
        ]
      });
      
      // Only include if payment is missing, unverified, or pending
      if (userPayment && userPayment.status === "verified") continue;

      let totalPlayers = 0;
      const formDetails = [];

      for (const form of userForms) {
        const fields = form.fields as Record<string, unknown> | undefined;
        const playerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
        const playerCount = playerFields.length;
        totalPlayers += playerCount;

        formDetails.push({
          formId: form._id.toString(),
          sport: form.sport || form.title,
          originalPlayers: 0,
          currentPlayers: playerCount,
          difference: playerCount,
        });
      }

      if (totalPlayers === 0) continue;

      const status = userPayment ? "unverified" : "unpaid";
      const recordId = userPayment ? userPayment._id.toString() : `unpaid_${ownerIdStr}`;
      
      const duePaymentRecord = await duePaymentsCollection.findOne({
        recordId,
      });

      duePayments.push({
        _id: recordId,
        userId: ownerIdStr,
        userName: user.name || "Unknown",
        userEmail: user.email || "Unknown",
        universityName: user.university || "Unknown",
        paymentId: userPayment?._id.toString() || "N/A",
        transactionId: userPayment?.transactionId || "N/A",
        originalPlayerCount: 0,
        currentPlayerCount: totalPlayers,
        playerDifference: totalPlayers,
        amountDue: totalPlayers * 800,
        status,
        lastUpdated: userPayment?.updatedAt || userPayment?.createdAt || new Date(),
        resolutionStatus: duePaymentRecord?.resolutionStatus || "pending",
        forms: formDetails,
      });
    }

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
              "Date", "Time", "User Name", "Email", "University", "Original Transaction ID",
              "Sports Modified", "Original Players", "Current Players", "Additional Players",
              "Amount Due (₹)", "Status", "Resolution"
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
