import { connectToDatabase } from "@/lib/mongodb";
import { google } from "googleapis";
import { ObjectId } from "mongodb";

/**
 * Event-driven Google Sheets sync - only syncs when data changes
 * Much more efficient than continuous polling
 */

// Feature flag from environment
const SHEETS_SYNC_ENABLED = process.env.SHEETS_SYNC_ENABLED !== 'false';

interface SyncResult {
  success: boolean;
  error?: string;
}

interface InitialSyncResult extends SyncResult {
  counts?: {
    forms: number;
    users: number;
    payments: number;
  };
}

interface SheetConfig {
  name: string;
  headers: string[];
}

const SHEET_CONFIGS: Record<string, SheetConfig> = {
  forms: {
    name: "Registrations",
    headers: ["Form ID", "Owner ID", "Sport/Event", "Status", "Created At", "Updated At", "Player Count", "Player Names", "Coach Name", "Coach Contact"]
  },
  users: {
    name: "Users",
    headers: ["User ID", "Name", "Email", "University", "Verified", "Registration Done", "Payment Done", "Created At"]
  },
  payments: {
    name: "Payments",
    headers: ["Payment ID", "Owner ID", "Amount (Numbers)", "Amount (Words)", "Payment Mode", "Transaction ID", "Payee Name", "Payment Date", "Status", "Created At"]
  }
};

/**
 * Format date safely - handles both Date objects and strings
 */
function formatDate(dateValue: unknown): string {
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
    return String(dateValue);
  }
}

/**
 * Sync a single form submission to Google Sheets
 * Updates existing row if form ID exists, otherwise appends new row
 */
export async function syncFormSubmission(formId: string): Promise<SyncResult> {
  if (!SHEETS_SYNC_ENABLED) {
    return { success: false, error: "Sheets sync is disabled" };
  }

  try {
    const { db } = await connectToDatabase();
    const form = await db.collection("form").findOne({ _id: new ObjectId(formId) });

    if (!form) {
      console.error("[Sheets] Form not found:", formId);
      return { success: false, error: "Form not found" };
    }

    // Format single form data
    const fields = form.fields as Record<string, unknown> | undefined;
    const playerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
    const coachFields = (fields?.coachFields as Record<string, unknown>) || {};

    const row = [
      form._id.toString(),
      form.ownerId ? form.ownerId.toString() : "",
      String(form.title || ""),
      String(form.status || ""),
      formatDate(form.createdAt),
      formatDate(form.updatedAt),
      playerFields.length.toString(),
      playerFields.map((p: Record<string, unknown>) => String(p.name || p.playerName || "")).join(", "),
      String(coachFields.name || ""),
      String(coachFields.contact || coachFields.phone || "")
    ];

    // Update or append to Google Sheet
    await updateOrAppendToSheet(SHEET_CONFIGS.forms.name, formId, row);

    console.log(`[Sheets] ✅ Synced form submission: ${formId}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Sheets] Error syncing form:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Sync a user registration to Google Sheets
 * Updates existing row if user ID exists, otherwise appends new row
 */
export async function syncUserRegistration(userId: string): Promise<SyncResult> {
  if (!SHEETS_SYNC_ENABLED) {
    return { success: false, error: "Sheets sync is disabled" };
  }

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      console.error("[Sheets] User not found:", userId);
      return { success: false, error: "User not found" };
    }

    const row = [
      user._id.toString(),
      String(user.name || ""),
      String(user.email || ""),
      String(user.universityName || ""),
      user.emailVerified ? "Yes" : "No",
      user.registrationDone ? "Yes" : "No",
      user.paymentDone ? "Yes" : "No",
      formatDate(user.createdAt)
    ];

    // Update or append to Google Sheet
    await updateOrAppendToSheet(SHEET_CONFIGS.users.name, userId, row);

    console.log(`[Sheets] ✅ Synced user registration: ${userId}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Sheets] Error syncing user:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Sync a payment submission to Google Sheets
 * Updates existing row if payment ID exists, otherwise appends new row
 */
export async function syncPaymentSubmission(paymentId: string): Promise<SyncResult> {
  if (!SHEETS_SYNC_ENABLED) {
    return { success: false, error: "Sheets sync is disabled" };
  }

  try {
    const { db } = await connectToDatabase();
    const payment = await db.collection("payments").findOne({ _id: new ObjectId(paymentId) });

    if (!payment) {
      console.error("[Sheets] Payment not found:", paymentId);
      return { success: false, error: "Payment not found" };
    }

    const row = [
      payment._id.toString(),
      payment.ownerId ? payment.ownerId.toString() : "",
      String(payment.amountInNumbers || ""),
      String(payment.amountInWords || ""),
      String(payment.paymentMode || ""),
      String(payment.transactionId || ""),
      String(payment.payeeName || ""),
      formatDate(payment.paymentDate),
      String(payment.status || ""),
      formatDate(payment.createdAt)
    ];

    // Update or append to Google Sheet
    await updateOrAppendToSheet(SHEET_CONFIGS.payments.name, paymentId, row);

    console.log(`[Sheets] ✅ Synced payment: ${paymentId}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Sheets] Error syncing payment:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Create authenticated Google Sheets client
 */
function createSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 
      !process.env.GOOGLE_PRIVATE_KEY || 
      !process.env.GOOGLE_SHEET_ID) {
    throw new Error("Google Sheets credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    spreadsheetId: process.env.GOOGLE_SHEET_ID
  };
}

/**
 * Find row index for a given ID in column A
 * Returns null if not found
 */
async function findRowByIdInSheet(sheetName: string, id: string): Promise<number | null> {
  try {
    const { sheets, spreadsheetId } = createSheetsClient();

    // Get all values in column A (IDs)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      return null;
    }

    // Find the row index (1-based, accounting for header row)
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === id) {
        return i + 1; // Sheets API uses 1-based indexing
      }
    }

    return null;
  } catch (error) {
    console.warn(`[Sheets] Could not search for ID ${id}:`, error);
    return null; // If search fails, fall back to append
  }
}

/**
 * Update existing row or append new row to sheet
 * Prevents duplicates by checking if ID exists in column A
 */
async function updateOrAppendToSheet(sheetName: string, id: string, row: string[], maxRetries = 3): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { sheets, spreadsheetId } = createSheetsClient();

      // Check if row already exists
      const existingRowIndex = await findRowByIdInSheet(sheetName, id);

      if (existingRowIndex !== null) {
        // Update existing row
        const range = `${sheetName}!A${existingRowIndex}:Z${existingRowIndex}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          requestBody: {
            values: [row]
          },
        });
        console.log(`[Sheets] Updated existing row ${existingRowIndex} for ID: ${id}`);
      } else {
        // Append new row
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [row]
          },
        });
        console.log(`[Sheets] Appended new row for ID: ${id}`);
      }

      return; // Success

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on credential/configuration errors
      if (lastError.message.includes('credentials') || 
          lastError.message.includes('not found') ||
          lastError.message.includes('permission')) {
        throw lastError;
      }

      // Retry with exponential backoff for transient errors
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[Sheets] Attempt ${attempt}/${maxRetries} failed, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error("Failed to update/append to sheet after retries");
}

/**
 * Helper function to append rows to a specific sheet with retry logic
 * Used only for initial sync where we know rows don't exist yet
 */
async function appendToSheet(sheetName: string, rows: string[][], maxRetries = 3): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { sheets, spreadsheetId } = createSheetsClient();

      // Append rows (doesn't overwrite existing data)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows
        },
      });

      return; // Success

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on credential/configuration errors
      if (lastError.message.includes('credentials') || 
          lastError.message.includes('not found') ||
          lastError.message.includes('permission')) {
        throw lastError;
      }

      // Retry with exponential backoff for transient errors
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[Sheets] Attempt ${attempt}/${maxRetries} failed, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error("Failed to append to sheet after retries");
}

/**
 * Get all sheet IDs from the spreadsheet
 */
async function getSheetIds(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string): Promise<Record<string, number>> {
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetIds: Record<string, number> = {};
    
    response.data.sheets?.forEach(sheet => {
      const title = sheet.properties?.title;
      const id = sheet.properties?.sheetId;
      if (title && id !== undefined && id !== null) {
        sheetIds[title] = id;
      }
    });
    
    return sheetIds;
  } catch (error) {
    console.warn("[Sheets] Could not fetch sheet IDs for formatting:", error);
    return {};
  }
}

/**
 * Apply comprehensive formatting to all sheets
 * - Bold headers with color
 * - Borders on all cells
 * - Alternating row colors for better readability
 */
async function formatSheets(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, sheetIds: Record<string, number>): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requests: any[] = [];

    Object.entries(sheetIds).forEach(([, sheetId]) => {
      // 1. Format header row (bold, dark blue background, white text)
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { 
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 } // White text
              },
              backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 }, // Blue header
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment)'
        }
      });

      // 2. Add borders to all cells in the sheet (first 1000 rows)
      requests.push({
        updateBorders: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1000,
            startColumnIndex: 0,
            endColumnIndex: 26 // Column Z
          },
          top: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          },
          bottom: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          },
          left: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          },
          right: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          },
          innerHorizontal: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          },
          innerVertical: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          }
        }
      });

      // 3. Freeze header row
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: {
              frozenRowCount: 1
            }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });

      // 4. Auto-resize columns
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 26
          }
        }
      });
    });

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
      console.log("[Sheets] ✅ All sheets formatted (headers, borders, colors)");
    }
  } catch (error) {
    console.warn("[Sheets] Could not format sheets (non-critical):", error);
  }
}

/**
 * Initial sync - run once to populate existing data
 * Only call this manually when setting up or recovering data
 */
export async function initialFullSync(): Promise<InitialSyncResult> {
  try {
    const { db } = await connectToDatabase();
    const { sheets, spreadsheetId } = createSheetsClient();

    // Sync forms
    console.log("[Sheets] Syncing forms...");
    const forms = await db.collection("form").find({}).toArray();
    if (forms.length > 0) {
      const formRows = forms.map(doc => {
        const fields = doc.fields as Record<string, unknown> | undefined;
        const playerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
        const coachFields = (fields?.coachFields as Record<string, unknown>) || {};
        
        return [
          doc._id.toString(),
          doc.ownerId ? doc.ownerId.toString() : "",
          String(doc.title || ""),
          String(doc.status || ""),
          formatDate(doc.createdAt),
          formatDate(doc.updatedAt),
          playerFields.length.toString(),
          playerFields.map((p: Record<string, unknown>) => String(p.name || p.playerName || "")).join(", "),
          String(coachFields.name || ""),
          String(coachFields.contact || coachFields.phone || "")
        ];
      });

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_CONFIGS.forms.name}!A1:ZZ`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_CONFIGS.forms.name}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [SHEET_CONFIGS.forms.headers, ...formRows]
        },
      });

      console.log(`[Sheets] ✅ Synced ${forms.length} forms`);
    }

    // Sync users
    console.log("[Sheets] Syncing users...");
    const users = await db.collection("users").find({}).toArray();
    if (users.length > 0) {
      const userRows = users.map(doc => [
        doc._id.toString(),
        String(doc.name || ""),
        String(doc.email || ""),
        String(doc.university || ""),
        doc.verified ? "Yes" : "No",
        doc.registrationDone ? "Yes" : "No",
        doc.paymentDone ? "Yes" : "No",
        formatDate(doc.createdAt)
      ]);

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_CONFIGS.users.name}!A1:ZZ`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_CONFIGS.users.name}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [SHEET_CONFIGS.users.headers, ...userRows]
        },
      });

      console.log(`[Sheets] ✅ Synced ${users.length} users`);
    }

    // Sync payments
    console.log("[Sheets] Syncing payments...");
    const payments = await db.collection("payments").find({}).toArray();
    if (payments.length > 0) {
      const paymentRows = payments.map(doc => [
        doc._id.toString(),
        doc.ownerId ? doc.ownerId.toString() : "",
        String(doc.amountInNumbers || ""),
        String(doc.amountInWords || ""),
        String(doc.paymentMode || ""),
        String(doc.transactionId || ""),
        String(doc.payeeName || ""),
        formatDate(doc.paymentDate),
        String(doc.status || ""),
        formatDate(doc.createdAt)
      ]);

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_CONFIGS.payments.name}!A1:ZZ`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_CONFIGS.payments.name}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [SHEET_CONFIGS.payments.headers, ...paymentRows]
        },
      });

      console.log(`[Sheets] ✅ Synced ${payments.length} payments`);
    }

    // Format all sheets (headers, borders, colors)
    const sheetIds = await getSheetIds(sheets, spreadsheetId);
    await formatSheets(sheets, spreadsheetId, sheetIds);

    console.log("[Sheets] ✅ Initial sync completed");
    return { 
      success: true, 
      counts: { 
        forms: forms.length, 
        users: users.length, 
        payments: payments.length 
      } 
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Sheets] Initial sync failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
