import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { google } from "googleapis";

/**
 * GET /api/health/sync-status
 * 
 * Health check endpoint to verify system cohesiveness
 * Checks if MongoDB and Google Sheets are accessible and in sync
 */
export async function GET(req: NextRequest) {
  const checks = {
    mongodb: false,
    googleSheets: false,
    dataConsistency: false,
    timestamp: new Date().toISOString(),
    errors: [] as string[]
  };

  try {
    // Check MongoDB connection
    const { db } = await connectToDatabase();
    checks.mongodb = true;

    // Check Google Sheets connection
    try {
      const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      if (!spreadsheetId) {
        throw new Error("GOOGLE_SHEET_ID not configured");
      }

      // Try to read from sheets
      await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets(properties(title))'
      });
      
      checks.googleSheets = true;
    } catch (error) {
      checks.errors.push(`Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check data consistency (sample check)
    try {
      const formsCollection = db.collection("form");
      const usersCollection = db.collection("users");
      
      // Get a sample of forms with owners
      const sampleForms = await formsCollection
        .find({ ownerId: { $exists: true } })
        .limit(5)
        .toArray();

      let consistentCount = 0;
      for (const form of sampleForms) {
        const user = await usersCollection.findOne({ _id: form.ownerId });
        if (user?.submittedForms?.[form.title as string]) {
          consistentCount++;
        }
      }

      checks.dataConsistency = sampleForms.length === 0 || consistentCount === sampleForms.length;
      
      if (!checks.dataConsistency) {
        checks.errors.push(`Data consistency: ${consistentCount}/${sampleForms.length} forms synced with user records`);
      }
    } catch (error) {
      checks.errors.push(`Consistency check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const allHealthy = checks.mongodb && checks.googleSheets && checks.dataConsistency;

    return NextResponse.json({
      healthy: allHealthy,
      checks,
      message: allHealthy ? "All systems operational" : "Some systems have issues"
    }, { 
      status: allHealthy ? 200 : 503 
    });

  } catch (error) {
    checks.errors.push(`System: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return NextResponse.json({
      healthy: false,
      checks,
      message: "System health check failed"
    }, { status: 503 });
  }
}
