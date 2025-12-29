import { connectToDatabase } from "@/lib/mongodb";
import { google } from "googleapis";
import { ObjectId } from "mongodb";

/**
 * Directly syncs a single record to Google Sheets without HTTP overhead
 * Used by API endpoints to avoid Cloudflare/proxy issues
 */
export async function syncRecordToSheet(
  collection: string,
  recordId: string,
  sheetName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`📊 Direct sync: collection=${collection}, recordId=${recordId}, sheetName=${sheetName}`);

    // Connect to MongoDB and fetch the specific record
    const { db } = await connectToDatabase();
    
    let document;
    
    // For payments, use aggregation to include user and form data
    if (collection === "payments") {
      const paymentAggregation = await db.collection(collection).aggregate([
        { $match: { _id: new ObjectId(recordId) } },
        {
          $lookup: {
            from: "users",
            localField: "ownerId",
            foreignField: "_id",
            as: "ownerData"
          }
        },
        {
          $lookup: {
            from: "form",
            localField: "ownerId",
            foreignField: "ownerId",
            as: "formsData"
          }
        },
        { $unwind: { path: "$ownerData", preserveNullAndEmptyArrays: true } },
      ]).toArray();
      
      document = paymentAggregation[0];
    } else {
      // For other collections, simple findOne
      document = await db.collection(collection).findOne({ _id: new ObjectId(recordId) });
    }

    if (!document) {
      return { success: false, message: `Record not found: ${recordId}` };
    }

    // Determine target sheet name
    let targetSheet = sheetName;
    if (!targetSheet) {
      if (collection === "users") targetSheet = "Users";
      else if (collection === "payments") targetSheet = "**Finance (Do Not Open)**";
      else if (collection === "form") targetSheet = "Forms";
      else targetSheet = "Sheet1";
    }

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return { success: false, message: "GOOGLE_SHEET_ID not configured" };
    }

    // Get existing sheet data to find the row
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!A:A`,
    });

    const existingIds = sheetData.data.values || [];
    const docIdString = document._id.toString();
    
    // Find row index (0-based in array, but 1-based for sheets)
    const rowIndex = existingIds.findIndex(([id]) => id === docIdString);

    // Transform document to row data based on collection
    let rowData: (string | number | boolean)[] = [];
    
    if (collection === "payments") {
      const owner = document.ownerData;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const forms = (document.formsData || []) as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPlayers = forms.reduce((sum: number, f: any) => sum + (f.players?.length || 0), 0);
      
      rowData = [
        document._id.toString(),
        owner?.name || "",
        owner?.phoneNumber || "",
        owner?.email || "",
        document.upiTransactionId || "",
        document.screenshotUrl || "",
        document.paymentAmount || 0,
        document.paymentStatus || "pending",
        document.paymentDone || false,
        totalPlayers,
        new Date(document.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        owner?.email || "",
        owner?.phoneNumber || "",
      ];
    } else if (collection === "users") {
      rowData = [
        document._id.toString(),
        document.name || "",
        document.email || "",
        document.phoneNumber || "",
        document.gender || "",
        document.college || "",
        document.registrationDone || false,
        document.paymentDone || false,
        new Date(document.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      ];
    } else if (collection === "form") {
      const owner = document.ownerData;
      rowData = [
        document._id.toString(),
        document.sport || "",
        document.category || "",
        document.players?.length || 0,
        JSON.stringify(document.players || []),
        document.status || "draft",
        owner?.name || "",
        owner?.email || "",
        owner?.phoneNumber || "",
        new Date(document.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      ];
    }

    if (rowIndex >= 0) {
      // Update existing row (skip header row, so +2)
      const sheetRowNumber = rowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheet}!A${sheetRowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [rowData],
        },
      });
      console.log(`✅ Updated ${targetSheet} row ${sheetRowNumber}`);
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${targetSheet}!A:A`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowData],
        },
      });
      console.log(`✅ Appended new row to ${targetSheet}`);
    }

    return { success: true, message: `Synced ${collection}:${recordId} to ${targetSheet}` };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Sync failed";
    console.error("❌ Direct sync error:", error);
    return { success: false, message: errorMessage };
  }
}
