import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { google } from "googleapis";
import { ObjectId } from "mongodb";

/**
 * POST /api/sync/incremental
 * 
 * Incrementally syncs a single record to Google Sheets
 * Only updates/appends the specific record that changed
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { collection, recordId, sheetName } = body;

    if (!collection || !recordId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: collection, recordId" },
        { status: 400 }
      );
    }

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
        { $limit: 1 }
      ]).toArray();
      
      if (paymentAggregation.length === 0) {
        return NextResponse.json(
          { success: false, message: "Record not found in database" },
          { status: 404 }
        );
      }
      document = paymentAggregation[0];
    } else if (collection === "form") {
      // For forms, include owner data
      const formAggregation = await db.collection(collection).aggregate([
        { $match: { _id: new ObjectId(recordId) } },
        {
          $lookup: {
            from: "users",
            localField: "ownerId",
            foreignField: "_id",
            as: "ownerData"
          }
        },
        { $limit: 1 }
      ]).toArray();
      
      if (formAggregation.length === 0) {
        return NextResponse.json(
          { success: false, message: "Record not found in database" },
          { status: 404 }
        );
      }
      document = formAggregation[0];
    } else {
      // For other collections, simple findOne
      const dataCollection = db.collection(collection);
      document = await dataCollection.findOne({ _id: new ObjectId(recordId) });
      
      if (!document) {
        return NextResponse.json(
          { success: false, message: "Record not found in database" },
          { status: 404 }
        );
      }
    }

    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID not configured");
    }

    const finalSheetName = sheetName || getSheetNameForCollection(collection);

    // Determine search strategy based on collection
    // Payments: Payment ID is in column D (4th column)
    // Users: Email is in column B (2nd column) - more reliable than hidden ID
    // Forms: User Email + Sport combo in columns D + A
    let searchColumn: string;
    let searchValue: string;
    
    if (collection === "payments") {
      searchColumn = "D";
      searchValue = recordId.toString();
    } else if (collection === "users") {
      searchColumn = "B"; // Email column
      searchValue = String(document.email || "");
    } else if (collection === "form") {
      // For forms, need to search by email (column D)
      const owner = (document.ownerData as Record<string, unknown>[] | undefined)?.[0];
      searchColumn = "D";
      searchValue = String(owner?.email || "");
    } else {
      searchColumn = "A";
      searchValue = recordId.toString();
    }

    // Get existing sheet data to find the row
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${finalSheetName}!${searchColumn}:${searchColumn}`, // Get search column
    });

    const rows = existingData.data.values || [];
    
    // Find the row index (skip header row)
    let rowIndex = -1;
    
    if (collection === "form") {
      // For forms, need to match BOTH email (column D) AND sport (column A)
      // Get all rows to compare both columns
      const allRowsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${finalSheetName}!A:D`,
      });
      const allRows = allRowsResponse.data.values || [];
      const formTitle = String(document.title || "");
      
      for (let i = 1; i < allRows.length; i++) {
        const rowSport = allRows[i][0] || ""; // Column A: Sport/Event
        const rowEmail = allRows[i][3] || ""; // Column D: User Email
        if (rowEmail === searchValue && rowSport === formTitle) {
          rowIndex = i;
          break;
        }
      }
    } else {
      // For other collections, simple match on search value
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === searchValue) {
          rowIndex = i;
          break;
        }
      }
    }

    // Format the record data
    const formattedRow = formatRecordForSheet(document, collection);

    // Check if the user is marked as deleted
    const isDeleted = document.deleted === true;

    if (rowIndex === -1) {
      // Record doesn't exist in sheet
      if (isDeleted) {
        // User is deleted and not in sheet - nothing to do
        return NextResponse.json({
          success: true,
          message: "Deleted record not in sheet, no action needed",
          action: "skip",
          recordId
        });
      }
      
      // Record doesn't exist - append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${finalSheetName}!A:A`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [formattedRow]
        },
      });

      return NextResponse.json({
        success: true,
        message: "Record appended to sheet",
        action: "append",
        recordId
      });
    } else {
      // Record exists in sheet
      if (isDeleted) {
        // Delete the row from Google Sheets
        const rowNumber = rowIndex + 1; // 1-indexed
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: await getSheetId(sheets, spreadsheetId, finalSheetName),
                  dimension: 'ROWS',
                  startIndex: rowIndex, // 0-indexed
                  endIndex: rowIndex + 1
                }
              }
            }]
          }
        });

        return NextResponse.json({
          success: true,
          message: "Record deleted from sheet",
          action: "delete",
          recordId,
          row: rowNumber
        });
      }
      
      // Record exists - update the row
      const rowNumber = rowIndex + 1; // 1-indexed
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${finalSheetName}!A${rowNumber}:Z${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [formattedRow]
        },
      });

      return NextResponse.json({
        success: true,
        message: "Record updated in sheet",
        action: "update",
        recordId,
        row: rowNumber
      });
    }

  } catch (error) {
    console.error("Incremental sync error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage || "Failed to sync record to Google Sheets"
      },
      { status: 500 }
    );
  }
}

/**
 * Get the appropriate sheet name for a collection
 */
function getSheetNameForCollection(collection: string): string {
  const sheetMap: Record<string, string> = {
    'form': 'Registrations',
    'users': 'Users',
    'payments': '**Finance (Do Not Open)**'
  };
  return sheetMap[collection] || 'Sheet1';
}

/**
 * Format a single record for the sheet based on collection type
 */
function formatRecordForSheet(doc: Record<string, unknown>, collectionName: string): unknown[] {
  if (collectionName === "form") {
    return formatFormRecord(doc);
  } else if (collectionName === "users") {
    return formatUserRecord(doc);
  } else if (collectionName === "payments") {
    return formatPaymentRecord(doc);
  } else {
    return formatGenericRecord(doc);
  }
}

/**
 * Format a single form record
 * Headers: ["Sport/Event", "Status", "University Name", "User Email", "User Phone", 
 *           "Created At", "Updated At", "Player Count", "Player Names", "Player Emails", 
 *           "Player Phones", "POC/Coach Name", "POC/Coach Email", "POC/Coach Phone"]
 */
function formatFormRecord(doc: Record<string, unknown>): unknown[] {
  const owner = (doc.ownerData as Record<string, unknown>[] | undefined)?.[0];
  const fields = doc.fields as Record<string, unknown> | undefined;
  const playerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
  const coachFields = (fields?.coachFields as Record<string, unknown>) || {};
  
  // Format dates
  const formatDate = (dateValue: unknown): string => {
    if (!dateValue) return "";
    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue as string);
      return date.toLocaleString('en-US', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return "";
    }
  };
  
  // Extract player details
  const playerNames = playerFields.map((p: Record<string, unknown>) => String(p.name || p.playerName || "")).join(" | ");
  const playerEmails = playerFields.map((p: Record<string, unknown>) => String(p.email || "")).join(" | ");
  const playerPhones = playerFields.map((p: Record<string, unknown>) => String(p.phone || "")).join(" | ");
  
  return [
    String(doc.title || ""),
    String(doc.status || ""),
    String(owner?.universityName || ""),
    String(owner?.email || ""),
    String(owner?.phone || ""),
    formatDate(doc.createdAt),
    formatDate(doc.updatedAt),
    playerFields.length.toString(),
    playerNames,
    playerEmails,
    playerPhones,
    String(coachFields.name || ""),
    String(coachFields.email || ""),
    String(coachFields.phone || coachFields.contact || "")
  ];
}

/**
 * Format a single user record
 * Headers: ["Name", "Email", "Contact Number", "University", "Verified", 
 *           "Registration Done", "Payment Done", "Created At"]
 */
function formatUserRecord(doc: Record<string, unknown>): unknown[] {
  const formatDate = (dateValue: unknown): string => {
    if (!dateValue) return "";
    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue as string);
      return date.toLocaleString('en-US', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return "";
    }
  };
  
  return [
    String(doc.name || ""),
    String(doc.email || ""),
    String(doc.phone || ""),
    String(doc.universityName || ""),
    doc.emailVerified ? "Yes" : "No",
    doc.registrationDone ? "Yes" : "No",
    doc.paymentDone ? "Yes" : "No",
    formatDate(doc.createdAt)
  ];
}

/**
 * Format a single payment record
 * Headers: ["Date", "Time", "Transaction ID", "Payment ID", "Payment Amount", 
 *           "Account Holder Name", "University", "Sports", "Category", "Player Count", 
 *           "Contact Number", "Email", "Payment Proof", "Status", "Send Email?"]
 */
function formatPaymentRecord(doc: Record<string, unknown>): unknown[] {
  const user = (doc.ownerData as Record<string, unknown>[] | undefined)?.[0];
  const forms = (doc.formsData as Record<string, unknown>[] | undefined) || [];
  
  // Extract user contact info
  const userEmail = String(user?.email || "");
  const userPhone = String(user?.phone || "");
  
  // Extract sports and calculate player count
  let sports = "";
  let numberOfPeople = 0;
  let category = "";
  
  if (forms.length > 0) {
    // Get all sports/events
    sports = forms.map((f: Record<string, unknown>) => String(f.title || "")).filter(Boolean).join(", ");
    // Count total players across all forms
    numberOfPeople = forms.reduce((total: number, form: Record<string, unknown>) => {
      const fields = form.fields as Record<string, unknown> | undefined;
      const playerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
      return total + playerFields.length;
    }, 0);
    // Derive category based on player count: Individual (1) or Team (multiple)
    category = numberOfPeople === 1 ? "Individual" : "Team";
  }
  
  // Format date and time separately
  const paymentDate = doc.paymentDate ? new Date(doc.paymentDate as string) : new Date();
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
  
  const paymentProofUrl = doc.paymentProof 
    ? `${process.env.NEXTAUTH_URL || process.env.ROOT_URL || "http://localhost:3000"}/api/payments/proof/${doc.paymentProof}`
    : "";
  
  return [
    date,
    time,
    String(doc.transactionId || ""),
    (doc._id as { toString: () => string }).toString(),
    String(doc.amountInNumbers || ""),
    String(doc.payeeName || ""),
    String(user?.universityName || ""),
    sports,
    category,
    numberOfPeople.toString(),
    userPhone,
    userEmail,
    paymentProofUrl,
    doc.registrationStatus || "Not Started",
    doc.sendEmail ? "Yes" : "No"
  ];
}

/**
 * Format a generic record
 */
function formatGenericRecord(doc: Record<string, unknown>): unknown[] {
  return [
    (doc._id as { toString: () => string }).toString(),
    JSON.stringify(doc)
  ];
}

/**
 * Get the sheet ID for a given sheet name
 */
async function getSheetId(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))'
  });
  
  const sheet = response.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  
  if (!sheet || !sheet.properties?.sheetId) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  return sheet.properties.sheetId;
}
