import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { google } from "googleapis";
import { getEmailFromToken } from "@/app/utils/forms/getEmail";

/**
 * POST /api/sync/sheets
 * 
 * Syncs MongoDB data to Google Sheets
 * Requires admin authentication
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const email = getEmailFromToken(req);
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    // Optional: Add admin email check
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (adminEmails.length > 0 && !adminEmails.includes(email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // 2. Get request body to determine what to sync
    const body = await req.json().catch(() => ({}));
    const { collection = "form", sheetName = "Sheet1" } = body;

    // 3. Connect to MongoDB and fetch data
    const { db } = await connectToDatabase();
    const dataCollection = db.collection(collection);
    
    // Fetch all documents (you can add filters here)
    const documents = await dataCollection.find({}).toArray();

    if (documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No data to sync",
        count: 0
      });
    }

    // 4. Format data for Google Sheets
    const { headers, rows } = formatDataForSheets(documents, collection);

    // 5. Authenticate with Google Sheets API
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
    
    if (!clientEmail || !privateKey) {
      return NextResponse.json(
        { success: false, message: "Google Sheets credentials not configured" },
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
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID not configured");
    }

    // 6. Clear existing data and write headers + rows
    // Clear the sheet first
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A1:ZZ`,
    });

    // Write headers and data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows]
      },
    });

    // 7. Format the header row (bold)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: {
              sheetId: 0, // Default first sheet
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)'
          }
        }]
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${rows.length} records to Google Sheets`,
      count: rows.length,
      collection,
      sheetName
    });

  } catch (error) {
    console.error("Google Sheets sync error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage || "Failed to sync data to Google Sheets",
        error: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Format MongoDB documents for Google Sheets
 */
function formatDataForSheets(documents: Record<string, unknown>[], collectionName: string) {
  if (collectionName === "form") {
    return formatFormData(documents);
  } else if (collectionName === "users") {
    return formatUserData(documents);
  } else if (collectionName === "payments") {
    return formatPaymentData(documents);
  } else {
    // Generic format for unknown collections
    return formatGenericData(documents);
  }
}

/**
 * Format registration form data
 */
function formatFormData(documents: Record<string, unknown>[]) {
  const headers = [
    "Form ID",
    "Owner ID",
    "Sport/Event",
    "Status",
    "Created At",
    "Updated At",
    "Player Count",
    "Player Names",
    "Coach Name",
    "Coach Contact"
  ];

  const rows = documents.map(doc => {
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
  });

  return { headers, rows };
}

/**
 * Format user data
 */
function formatUserData(documents: Record<string, unknown>[]) {
  const headers = [
    "User ID",
    "Name",
    "Email",
    "University",
    "Verified",
    "Registration Done",
    "Payment Done",
    "Created At"
  ];

  const rows = documents.map(doc => [
    (doc._id as { toString: () => string }).toString(),
    doc.name || "",
    doc.email || "",
    doc.universityName || "",
    doc.emailVerified ? "Yes" : "No",
    doc.registrationDone ? "Yes" : "No",
    doc.paymentDone ? "Yes" : "No",
    doc.createdAt ? new Date(doc.createdAt as string).toLocaleString() : ""
  ]);

  return { headers, rows };
}

/**
 * Format payment data
 */
function formatPaymentData(documents: Record<string, unknown>[]) {
  const headers = [
    "Payment ID",
    "Owner ID",
    "Amount (Numbers)",
    "Amount (Words)",
    "Payment Mode",
    "Transaction ID",
    "Payee Name",
    "Payment Date",
    "Status",
    "Created At"
  ];

  const rows = documents.map(doc => [
    (doc._id as { toString: () => string }).toString(),
    doc.ownerId ? (doc.ownerId as { toString: () => string }).toString() : "",
    doc.amountInNumbers || "",
    doc.amountInWords || "",
    doc.paymentMode || "",
    doc.transactionId || "",
    doc.payeeName || "",
    doc.paymentDate ? new Date(doc.paymentDate as string).toLocaleString() : "",
    doc.status || "",
    doc.createdAt ? new Date(doc.createdAt as string).toLocaleString() : ""
  ]);

  return { headers, rows };
}

/**
 * Generic formatter for unknown collections
 */
function formatGenericData(documents: Record<string, unknown>[]) {
  if (documents.length === 0) {
    return { headers: [], rows: [] };
  }

  // Extract all unique keys from all documents
  const allKeys = new Set<string>();
  documents.forEach(doc => {
    Object.keys(doc).forEach(key => {
      if (key !== '_id') allKeys.add(key);
    });
  });

  const headers = ["Document ID", ...Array.from(allKeys)];

  const rows = documents.map(doc => {
    const row = [(doc._id as { toString: () => string }).toString()];
    allKeys.forEach(key => {
      const value = doc[key];
      if (value === null || value === undefined) {
        row.push("");
      } else if (typeof value === 'object') {
        row.push(JSON.stringify(value));
      } else {
        row.push(String(value));
      }
    });
    return row;
  });

  return { headers, rows };
}
