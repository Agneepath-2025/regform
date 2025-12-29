import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const auditLogsCollection = db.collection("auditLogs");

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const action = searchParams.get("action");
    const collection = searchParams.get("collection");
    const userId = searchParams.get("userId");

    // Build query
    const query: Record<string, unknown> = {};
    if (action) query.action = action;
    if (collection) query.collection = collection;
    if (userId) query.userId = userId;

    // Fetch logs
    const logs = await auditLogsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
