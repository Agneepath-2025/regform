import { NextRequest, NextResponse } from "next/server";
import { initialFullSync } from "@/app/utils/sheets-event-sync";

/**
 * GET /api/sync/event - Get event-driven sync status
 * POST /api/sync/event - Trigger initial full sync (run once to populate existing data)
 */

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "event-driven",
    description: "Forms, users, and payments sync automatically when submitted",
    endpoints: {
      initial_sync: "POST /api/sync/event - Run once to sync existing data",
      automatic: "Syncs happen automatically on form/payment submissions"
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "initial") {
      console.log("[Sheets] Starting initial full sync...");
      const result = await initialFullSync();
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: "Initial sync completed successfully",
          counts: result.counts
        });
      } else {
        return NextResponse.json(
          { success: false, message: result.error },
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
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
