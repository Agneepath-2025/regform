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
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    
    if (!clientEmail || !privateKey) {
      return { success: false, message: "Google Sheets credentials not configured" };
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
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
      range: `${targetSheet}!A:Z`,
    });

    const allRows = sheetData.data.values || [];
    
    // Find row index based on collection-specific column
    let rowIndex = -1;
    
    if (collection === "payments") {
      // Payment ID is in column D (index 3)
      const docIdString = document._id.toString();
      for (let i = 1; i < allRows.length; i++) {
        if (allRows[i][3] === docIdString) {
          rowIndex = i;
          break;
        }
      }
    } else if (collection === "users") {
      // Email is in column B (index 1)
      const emailString = document.email || "";
      for (let i = 1; i < allRows.length; i++) {
        if (allRows[i][1] === emailString) {
          rowIndex = i;
          break;
        }
      }
    } else {
      // Other collections: ID in column A
      const docIdString = document._id.toString();
      for (let i = 1; i < allRows.length; i++) {
        if (allRows[i][0] === docIdString) {
          rowIndex = i;
          break;
        }
      }
    }

    // Transform document to row data based on collection
    let rowData: (string | number | boolean)[] = [];
    
    if (collection === "payments") {
      const owner = document.ownerData as Record<string, unknown> | undefined;
      const forms = (document.formsData || []) as Record<string, unknown>[];
      
      // Calculate sports and player count
      const sports = forms.map((f: Record<string, unknown>) => String(f.title || "")).filter(Boolean).join(", ");
      const totalPlayers = forms.reduce((sum: number, f: Record<string, unknown>) => {
        const fields = (f.fields as Record<string, unknown>) || {};
        const playerFields = (fields.playerFields as Record<string, unknown>[]) || [];
        return sum + playerFields.length;
      }, 0);
      const category = totalPlayers === 1 ? "Individual" : "Team";
      
      // Format date and time
      const paymentDate = document.paymentDate ? new Date(document.paymentDate) : new Date();
      const date = paymentDate.toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const time = paymentDate.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      const paymentProofUrl = document.paymentProof 
        ? `${process.env.NEXTAUTH_URL || process.env.ROOT_URL || "http://localhost:3000"}/api/payments/proof/${document.paymentProof}`
        : "";
      
      // Match the format: Date, Time, Transaction ID, Payment ID, Payment Amount, Account Holder Name, 
      // University, Sports, Category, Player Count, Contact Number, Email, Payment Proof, Status, Send Email?
      rowData = [
        date,
        time,
        String(document.transactionId || ""),
        document._id.toString(),
        String(document.amountInNumbers || document.amount || ""),
        String(document.payeeName || ""),
        String(owner?.universityName || ""),
        sports,
        category,
        totalPlayers.toString(),
        String(owner?.phone || ""),
        String(owner?.email || ""),
        paymentProofUrl,
        document.registrationStatus || "Not Started",
        document.sendEmail ? "Yes" : "No"
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
      // Update existing row (rowIndex is 0-based, row 0 is header, so rowIndex 1 = row 2 in sheet)
      const sheetRowNumber = rowIndex + 1;
      console.log(`🔄 Updating existing row ${sheetRowNumber} in ${targetSheet}`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheet}!A${sheetRowNumber}:Z${sheetRowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [rowData],
        },
      });
      console.log(`✅ Updated ${targetSheet} row ${sheetRowNumber}`);
    } else {
      // Append new row
      console.log(`➕ Appending new row to ${targetSheet}`);
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
