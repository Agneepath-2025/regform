import { NextRequest, NextResponse } from "next/server";
import { startAutoSync, stopAutoSync, getSyncStatus } from "@/app/utils/sheets-sync-service";

/**
 * GET /api/sync/auto - Get sync service status
 * POST /api/sync/auto - Control sync service (start/stop)
 */

export async function GET() {
  try {
    const status = getSyncStatus();
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "start") {
      startAutoSync();
      return NextResponse.json({
        success: true,
        message: "Auto-sync service started (syncing every 5 seconds)"
      });
    }

    if (action === "stop") {
      stopAutoSync();
      return NextResponse.json({
        success: true,
        message: "Auto-sync service stopped"
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action. Use 'start' or 'stop'" },
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
