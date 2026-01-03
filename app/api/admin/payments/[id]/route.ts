import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logAuditEvent } from "@/app/utils/audit-logger";
import { syncRecordToSheet } from "@/app/utils/incremental-sync";

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
    const formsCollection = db.collection("form");

    // Fetch existing payment for audit logging
    const existingPayment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

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

    // Log audit event for payment verification
    await logAuditEvent({
      timestamp: new Date(),
      action: body.status === "verified" ? "PAYMENT_VERIFIED" : "PAYMENT_STATUS_UPDATED",
      collection: "payments",
      recordId: id,
      userId: result.ownerId?.toString(),
      userEmail: session.user.email,
      changes: {
        status: { before: existingPayment?.status, after: body.status }
      },
      metadata: {
        adminEmail: session.user.email,
        paymentAmount: result.amountInNumbers || result.amount,
        transactionId: result.transactionId,
        previousStatus: existingPayment?.status,
        newStatus: body.status,
      },
    });

    // Update user's paymentDone status if payment is verified
    if (body.status === "verified" && result.userId) {
      // Begin transaction-like operations - track success for rollback if needed
      const operations = {
        userPaymentDone: false,
        formsUpdated: false,
        statusesUpdated: false
      };

      try {
        // Update paymentDone flag
        await usersCollection.updateOne(
          { _id: new ObjectId(result.userId.toString()) },
          { $set: { paymentDone: true } }
        );
        operations.userPaymentDone = true;

        // 🔄 CRITICAL: Update all submittedForms status to 'confirmed' for dashboard
        // Get all forms for this user to update their status
        const userForms = await formsCollection
          .find({ ownerId: new ObjectId(result.userId.toString()) })
          .toArray();

        if (userForms.length > 0) {
          const statusUpdates: Record<string, string> = {};
          const formUpdatePromises = [];
          
          for (const form of userForms) {
            statusUpdates[`submittedForms.${form.title}.status`] = 'confirmed';
            
            // Also update the form collection status
            formUpdatePromises.push(
              formsCollection.updateOne(
                { _id: form._id },
                { $set: { status: 'confirmed' } }
              )
            );
          }

          // Execute form updates in parallel
          await Promise.all(formUpdatePromises);
          operations.formsUpdated = true;

          // Update all sport statuses in user's submittedForms
          await usersCollection.updateOne(
            { _id: new ObjectId(result.userId.toString()) },
            { $set: statusUpdates }
          );
          operations.statusesUpdated = true;

          console.log(`✅ Updated ${userForms.length} forms to 'confirmed' status for user ${result.userId}`);
        }
      } catch (error) {
        // Log which operations succeeded before failure
        console.error(`🚨 Payment verification partially failed:`, {
          operations,
          error
        });
        // Don't throw - payment status was updated, user can retry verification
      }
    } else if (body.status !== "verified" && result.userId) {
      await usersCollection.updateOne(
        { _id: new ObjectId(result.userId.toString()) },
        { $set: { paymentDone: false } }
      );

      // Update submittedForms status back to 'not_confirmed'
      const userForms = await formsCollection
        .find({ ownerId: new ObjectId(result.userId.toString()) })
        .toArray();

      if (userForms.length > 0) {
        const statusUpdates: Record<string, string> = {};
        for (const form of userForms) {
          statusUpdates[`submittedForms.${form.title}.status`] = 'not_confirmed';
        }

        await usersCollection.updateOne(
          { _id: new ObjectId(result.userId.toString()) },
          { $set: statusUpdates }
        );
      }
    }

    // Trigger incremental Google Sheets sync (non-blocking but with better error handling)
    try {
      console.log(`🔄 Triggering direct payment sync for record ${id} to Google Sheets...`);
      
      // Sync the payment record directly (no HTTP call)
      const paymentSyncResult = await syncRecordToSheet(
        "payments",
        id,
        "**Finance (Do Not Open)**"
      );

      if (!paymentSyncResult.success) {
        console.error(`❌ Payment sync failed:`, paymentSyncResult.message);
      } else {
        console.log("✅ Payment sync successful:", paymentSyncResult.message);
      }

      // Also sync the user record if payment status changed
      if (result.userId) {
        console.log(`🔄 Triggering direct user sync for user ${result.userId} to Google Sheets...`);
        const userSyncResult = await syncRecordToSheet(
          "users",
          result.userId.toString(),
          "Users"
        );

        if (!userSyncResult.success) {
          console.error(`❌ User sync failed:`, userSyncResult.message);
        } else {
          console.log("✅ User sync successful:", userSyncResult.message);
        }
      }
      
    } catch (error) {
      console.error("❌ Error triggering sync:", error);
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
