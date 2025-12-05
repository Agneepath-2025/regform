import { NextRequest, NextResponse } from "next/server";
import { initialFullSync } from "@/app/utils/sheets-event-sync";

/**
 * GET /api/sync/event - Get event-driven sync status
 * POST /api/sync/event - Trigger initial full sync (run once to populate existing data)
 */

const SHEETS_SYNC_ENABLED = process.env.SHEETS_SYNC_ENABLED !== 'false';

export async function GET() {
  const isConfigured = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );

  return NextResponse.json({
    success: true,
    mode: "event-driven",
    enabled: SHEETS_SYNC_ENABLED,
    configured: isConfigured,
    description: SHEETS_SYNC_ENABLED 
      ? "Forms, users, and payments sync automatically when submitted"
      : "Sheets sync is currently disabled",
    endpoints: {
      status: "GET /api/sync/event - Check sync configuration",
      initial_sync: "POST /api/sync/event with {\"action\": \"initial\"} - Run once to sync existing data"
    },
    environment: {
      SHEETS_SYNC_ENABLED,
      hasCredentials: isConfigured
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    // Check if sync is enabled
    if (!SHEETS_SYNC_ENABLED) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Sheets sync is disabled. Set SHEETS_SYNC_ENABLED=true to enable" 
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "initial") {
      console.log("[Sheets API] Starting initial full sync...");
      const startTime = Date.now();
      const result = await initialFullSync();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: "Initial sync completed successfully",
          counts: result.counts,
          durationMs: duration
        });
      } else {
        return NextResponse.json(
          { 
            success: false, 
            message: result.error || "Initial sync failed",
            durationMs: duration
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Invalid action. Use {\"action\": \"initial\"} to sync existing data" 
      },
      { status: 400 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Sheets API] Error:", errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
