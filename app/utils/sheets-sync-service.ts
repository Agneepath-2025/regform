import { connectToDatabase } from "@/lib/mongodb";
import { google } from "googleapis";

/**
 * Background service that syncs MongoDB to Google Sheets every 5 seconds
 */

let syncInterval: NodeJS.Timeout | null = null;
let isRunning = false;

interface SyncConfig {
  collection: string;
  sheetName: string;
}

const syncConfigs: SyncConfig[] = [
  { collection: "form", sheetName: "Sheet1" },
  { collection: "users", sheetName: "Users" },
  { collection: "payments", sheetName: "Payments" },
];

/**
 * Format data for Google Sheets based on collection type
 */
function formatDataForSheets(documents: Record<string, unknown>[], collectionName: string) {
  if (collectionName === "form") {
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
    });    return { headers, rows };
  }

  if (collectionName === "users") {
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
      doc.university || "",
      doc.verified ? "Yes" : "No",
      doc.registrationDone ? "Yes" : "No",
      doc.paymentDone ? "Yes" : "No",
      doc.createdAt ? new Date(doc.createdAt as string).toLocaleString() : ""
    ]);

    return { headers, rows };
  }

  if (collectionName === "payments") {
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

  return { headers: [], rows: [] };
}

/**
 * Sync a single collection to Google Sheets
 */
async function syncCollectionToSheets(config: SyncConfig) {
  try {
    // 1. Get MongoDB data
    const { db } = await connectToDatabase();
    const collection = db.collection(config.collection);
    const documents = await collection.find({}).toArray();

    if (documents.length === 0) {
      console.log(`[Sync] ${config.collection}: No data to sync`);
      return { success: true, count: 0 };
    }

    // 2. Format data
    const { headers, rows } = formatDataForSheets(documents, config.collection);

    if (headers.length === 0) {
      return { success: true, count: 0 };
    }

    // 3. Authenticate with Google Sheets
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

    // 4. Clear and write data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${config.sheetName}!A1:ZZ`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${config.sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows]
      },
    });

    // 5. Format header (only on first sync or when needed)
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
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
    } catch {
      // Ignore formatting errors
    }

    console.log(`[Sync] ${config.collection} → ${config.sheetName}: ${rows.length} records`);
    return { success: true, count: rows.length };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Sync Error] ${config.collection}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Main sync function - runs every 5 seconds
 */
async function performSync() {
  if (isRunning) {
    console.log("[Sync] Previous sync still running, skipping...");
    return;
  }

  isRunning = true;
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n[Sync] Starting sync at ${timestamp}...`);

  try {
    // Sync all configured collections
    for (const config of syncConfigs) {
      await syncCollectionToSheets(config);
    }
    console.log(`[Sync] Completed at ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Sync] Fatal error:", errorMessage);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the auto-sync service
 */
export function startAutoSync() {
  if (syncInterval) {
    console.log("[Sync] Auto-sync already running");
    return;
  }

  // Verify required environment variables
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 
      !process.env.GOOGLE_PRIVATE_KEY || 
      !process.env.GOOGLE_SHEET_ID) {
    console.error("[Sync] ❌ Google Sheets credentials not configured. Auto-sync disabled.");
    console.error("[Sync] Required env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID");
    return;
  }

  console.log("[Sync] 🚀 Starting auto-sync service (every 5 seconds)...");
  
  // Run immediately on start
  performSync();

  // Then run every 5 seconds
  syncInterval = setInterval(() => {
    performSync();
  }, 5000);

  console.log("[Sync] ✅ Auto-sync service started");
}

/**
 * Stop the auto-sync service
 */
export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("[Sync] Auto-sync service stopped");
  }
}

/**
 * Get sync service status
 */
export function getSyncStatus() {
  return {
    isRunning: !!syncInterval,
    currentlyProcessing: isRunning,
    configs: syncConfigs,
  };
}
