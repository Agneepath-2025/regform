import { connectToDatabase } from "@/lib/mongodb";
import { google } from "googleapis";
import { ObjectId } from "mongodb";

/**
 * Event-driven Google Sheets sync - only syncs when data changes
 * Much more efficient than continuous polling
 */

interface SheetRow {
  [key: string]: string | number;
}

/**
 * Sync a single form submission to Google Sheets
 * Called when a form is submitted
 */
export async function syncFormSubmission(formId: string) {
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
      form.title || "",
      form.status || "",
      form.createdAt ? new Date(form.createdAt as string).toLocaleString() : "",
      form.updatedAt ? new Date(form.updatedAt as string).toLocaleString() : "",
      playerFields.length,
      playerFields.map((p: Record<string, unknown>) => (p.name || p.playerName || "") as string).join(", "),
      coachFields.name || "",
      coachFields.contact || coachFields.phone || ""
    ];

    // Append to Google Sheet
    await appendToSheet("Sheet1", [row]);

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
 * Called when a new user registers
 */
export async function syncUserRegistration(userId: string) {
  try {
    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      console.error("[Sheets] User not found:", userId);
      return { success: false, error: "User not found" };
    }

    const row = [
      user._id.toString(),
      user.name || "",
      user.email || "",
      user.university || "",
      user.verified ? "Yes" : "No",
      user.registrationDone ? "Yes" : "No",
      user.paymentDone ? "Yes" : "No",
      user.createdAt ? new Date(user.createdAt as string).toLocaleString() : ""
    ];

    await appendToSheet("Users", [row]);

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
 * Called when a payment is submitted
 */
export async function syncPaymentSubmission(paymentId: string) {
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
      payment.amountInNumbers || "",
      payment.amountInWords || "",
      payment.paymentMode || "",
      payment.transactionId || "",
      payment.payeeName || "",
      payment.paymentDate ? new Date(payment.paymentDate as string).toLocaleString() : "",
      payment.status || "",
      payment.createdAt ? new Date(payment.createdAt as string).toLocaleString() : ""
    ];

    await appendToSheet("Payments", [row]);

    console.log(`[Sheets] ✅ Synced payment: ${paymentId}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Sheets] Error syncing payment:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Helper function to append rows to a specific sheet
 */
async function appendToSheet(sheetName: string, rows: (string | number)[][]) {
  try {
    // Check if credentials are configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 
        !process.env.GOOGLE_PRIVATE_KEY || 
        !process.env.GOOGLE_SHEET_ID) {
      console.warn("[Sheets] Credentials not configured, skipping sync");
      return { success: false, error: "Credentials not configured" };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Append rows (doesn't overwrite existing data)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      requestBody: {
        values: rows
      },
    });

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * Initial sync - run once to populate existing data
 * Only call this manually when setting up or recovering data
 */
export async function initialFullSync() {
  try {
    const { db } = await connectToDatabase();

    // Check credentials
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 
        !process.env.GOOGLE_PRIVATE_KEY || 
        !process.env.GOOGLE_SHEET_ID) {
      throw new Error("Google Sheets credentials not configured");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Sync forms
    console.log("[Sheets] Syncing forms...");
    const forms = await db.collection("form").find({}).toArray();
    if (forms.length > 0) {
      const formHeaders = ["Form ID", "Owner ID", "Sport/Event", "Status", "Created At", "Updated At", "Player Count", "Player Names", "Coach Name", "Coach Contact"];
      const formRows = forms.map(doc => {
        const fields = doc.fields as Record<string, unknown> | undefined;
        const playerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
        const coachFields = (fields?.coachFields as Record<string, unknown>) || {};
        
        return [
          doc._id.toString(),
          doc.ownerId ? doc.ownerId.toString() : "",
          doc.title || "",
          doc.status || "",
          doc.createdAt ? new Date(doc.createdAt).toLocaleString() : "",
          doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "",
          playerFields.length,
          playerFields.map((p: Record<string, unknown>) => (p.name || p.playerName || "") as string).join(", "),
          coachFields.name || "",
          coachFields.contact || coachFields.phone || ""
        ];
      });

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `Sheet1!A1:ZZ`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [formHeaders, ...formRows]
        },
      });

      console.log(`[Sheets] ✅ Synced ${forms.length} forms`);
    }

    // Sync users
    console.log("[Sheets] Syncing users...");
    const users = await db.collection("users").find({}).toArray();
    if (users.length > 0) {
      const userHeaders = ["User ID", "Name", "Email", "University", "Verified", "Registration Done", "Payment Done", "Created At"];
      const userRows = users.map(doc => [
        doc._id.toString(),
        doc.name || "",
        doc.email || "",
        doc.university || "",
        doc.verified ? "Yes" : "No",
        doc.registrationDone ? "Yes" : "No",
        doc.paymentDone ? "Yes" : "No",
        doc.createdAt ? new Date(doc.createdAt).toLocaleString() : ""
      ]);

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `Users!A1:ZZ`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Users!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [userHeaders, ...userRows]
        },
      });

      console.log(`[Sheets] ✅ Synced ${users.length} users`);
    }

    // Sync payments
    console.log("[Sheets] Syncing payments...");
    const payments = await db.collection("payments").find({}).toArray();
    if (payments.length > 0) {
      const paymentHeaders = ["Payment ID", "Owner ID", "Amount (Numbers)", "Amount (Words)", "Payment Mode", "Transaction ID", "Payee Name", "Payment Date", "Status", "Created At"];
      const paymentRows = payments.map(doc => [
        doc._id.toString(),
        doc.ownerId ? doc.ownerId.toString() : "",
        doc.amountInNumbers || "",
        doc.amountInWords || "",
        doc.paymentMode || "",
        doc.transactionId || "",
        doc.payeeName || "",
        doc.paymentDate ? new Date(doc.paymentDate).toLocaleString() : "",
        doc.status || "",
        doc.createdAt ? new Date(doc.createdAt).toLocaleString() : ""
      ]);

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `Payments!A1:ZZ`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Payments!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [paymentHeaders, ...paymentRows]
        },
      });

      console.log(`[Sheets] ✅ Synced ${payments.length} payments`);
    }

    // Format headers
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

    console.log("[Sheets] ✅ Initial sync completed");
    return { success: true, counts: { forms: forms.length, users: users.length, payments: payments.length } };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Sheets] Initial sync failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
