import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { db } = await connectToDatabase();
    const paymentsCollection = db.collection("payments");

    const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();
    const paymentsCollection = db.collection("payments");
    const usersCollection = db.collection("users");

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Allow updating specific fields
    const allowedFields = [
      "transactionId",
      "amount",
      "status",
      "registrationStatus",
      "sendEmail",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Automatically update registrationStatus when status changes
    if (body.status === "verified") {
      updateData.registrationStatus = "Confirmed";
    } else if (body.status === "rejected") {
      updateData.registrationStatus = "Rejected";
    } else if (body.status === "pending") {
      updateData.registrationStatus = "In Progress";
    }

    const result = await paymentsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update user's paymentDone status if payment is verified
    if (body.status === "verified" && result.userId) {
      await usersCollection.updateOne(
        { _id: new ObjectId(result.userId.toString()) },
        { $set: { paymentDone: true } }
      );
    } else if (body.status !== "verified" && result.userId) {
      await usersCollection.updateOne(
        { _id: new ObjectId(result.userId.toString()) },
        { $set: { paymentDone: false } }
      );
    }

    // Trigger incremental Google Sheets sync (non-blocking)
    try {
      // Sync the payment record
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sync/incremental`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          collection: "payments",
          recordId: id,
          sheetName: "**Finance (Do Not Open)**"
        }),
      }).catch(err => console.error("Payment sync failed:", err));

      // Also sync the user record if payment status changed
      if (result.userId) {
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sync/incremental`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            collection: "users",
            recordId: result.userId.toString(),
            sheetName: "Users"
          }),
        }).catch(err => console.error("User sync failed:", err));
      }
    } catch (error) {
      console.error("Error triggering sync:", error);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
