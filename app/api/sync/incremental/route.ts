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
    const dataCollection = db.collection(collection);
    
    const document = await dataCollection.findOne({ _id: new ObjectId(recordId) });

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Record not found in database" },
        { status: 404 }
      );
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

    // Get existing sheet data to find the row
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${finalSheetName}!A:A`, // Get first column (IDs)
    });

    const rows = existingData.data.values || [];
    const recordIdString = recordId.toString();
    
    // Find the row index (skip header row)
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === recordIdString) {
        rowIndex = i;
        break;
      }
    }

    // Format the record data
    const formattedRow = formatRecordForSheet(document, collection);

    if (rowIndex === -1) {
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
    'form': 'Forms',
    'users': 'Users',
    'payments': 'Payments'
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
 */
function formatFormRecord(doc: Record<string, unknown>): unknown[] {
  const fields = doc.fields as Record<string, unknown> | undefined;
  const playerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
  const coachFields = (fields?.coachFields as Record<string, unknown>) || {};
  
  return [
    (doc._id as { toString: () => string }).toString(),
    doc.ownerId ? (doc.ownerId as { toString: () => string }).toString() : "",
    doc.title || "",
    doc.status || "",
    doc.createdAt ? new Date(doc.createdAt as string).toLocaleString() : "",
    doc.updatedAt ? new Date(doc.updatedAt as string).toLocaleString() : "",
    playerFields.length,
    playerFields.map((p: Record<string, unknown>) => (p.name || p.playerName || "") as string).join(", "),
    coachFields.name || "",
    coachFields.contact || coachFields.phone || ""
  ];
}

/**
 * Format a single user record
 */
function formatUserRecord(doc: Record<string, unknown>): unknown[] {
  return [
    (doc._id as { toString: () => string }).toString(),
    doc.name || "",
    doc.email || "",
    doc.universityName || "",
    doc.emailVerified ? "Yes" : "No",
    doc.registrationDone ? "Yes" : "No",
    doc.paymentDone ? "Yes" : "No",
    doc.createdAt ? new Date(doc.createdAt as string).toLocaleString() : ""
  ];
}

/**
 * Format a single payment record
 */
function formatPaymentRecord(doc: Record<string, unknown>): unknown[] {
  return [
    (doc._id as { toString: () => string }).toString(),
    doc.ownerId ? (doc.ownerId as { toString: () => string }).toString() : "",
    doc.amountInNumbers || "",
    doc.amountInWords || "",
    doc.paymentMode || "",
    doc.transactionId || "",
    doc.payeeName || "",
    doc.paymentDate ? new Date(doc.paymentDate as string).toLocaleString() : "",
    doc.status || "",
    doc.registrationStatus || "Not Started",
    doc.createdAt ? new Date(doc.createdAt as string).toLocaleString() : ""
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
