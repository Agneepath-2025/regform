import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * PATCH /api/admin/due-payments/[id]/status
 * 
 * Updates the resolution status of a due payment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { resolutionStatus } = body;

    if (!["pending", "in_progress", "resolved"].includes(resolutionStatus)) {
      return NextResponse.json(
        { error: "Invalid resolution status" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const duePaymentsCollection = db.collection("duePayments");

    // Store resolution status in a dedicated collection
    const result = await duePaymentsCollection.updateOne(
      { _id: id },
      {
        $set: {
          resolutionStatus,
          lastStatusUpdate: new Date(),
          updatedBy: session.user.email
        }
      },
      { upsert: true }
    );

    console.log(`✅ Due payment ${id} status updated to: ${resolutionStatus}`);

    return NextResponse.json({
      success: true,
      data: { resolutionStatus }
    });

  } catch (error) {
    console.error("Error updating due payment status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
