import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logAuditEvent, calculateChanges } from "@/app/utils/audit-logger";

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
    const formsCollection = db.collection("form");

    const form = await formsCollection
      .aggregate([
        {
          $match: { _id: new ObjectId(id) },
        },
        {
          $lookup: {
            from: "users",
            localField: "ownerId",
            foreignField: "_id",
            as: "owner",
          },
        },
        {
          $unwind: {
            path: "$owner",
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .toArray();

    if (!form || form.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: form[0] });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: "Failed to fetch form" },
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
    const formsCollection = db.collection("form");

    // Check if form exists and get current timestamp for concurrency control
    const existingForm = await formsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Optional: Check for concurrent modifications
    if (body.lastUpdatedAt) {
      const clientLastUpdate = new Date(body.lastUpdatedAt as string);
      const serverLastUpdate = existingForm.updatedAt ? new Date(existingForm.updatedAt as string) : new Date(0);
      if (serverLastUpdate > clientLastUpdate) {
        console.warn(`⚠️ Concurrent modification detected for form ${id}`);
        return NextResponse.json({ 
          error: "Form was modified by another user. Please refresh and try again.",
          conflict: true 
        }, { status: 409 });
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Allow updating specific fields
    if (body.status) {
      updateData.status = body.status;
      console.log(`📝 Admin updating form ${id} status to: ${body.status}`);
    }

    if (body.fields) {
      updateData.fields = body.fields;
      console.log(`📝 Admin updating form ${id} fields`);
    }

    // Validation: Check if fields update would result in invalid state
    if (body.fields) {
      const fields = body.fields as Record<string, unknown>;
      const playerFieldsArray = fields?.playerFields as Record<string, unknown>[] | undefined;
      if (playerFieldsArray && playerFieldsArray.length === 0) {
        return NextResponse.json({ 
          error: "Cannot save form with zero players. Please add at least one player." 
        }, { status: 400 });
      }
    }

    const result = await formsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Log audit event for form edit
    const changes = calculateChanges(
      existingForm as Record<string, unknown>,
      result as Record<string, unknown>
    );
    await logAuditEvent({
      timestamp: new Date(),
      action: "FORM_EDITED",
      collection: "form",
      recordId: id,
      userId: result.ownerId?.toString(),
      userEmail: session.user.email,
      changes,
      metadata: {
        adminEmail: session.user.email,
        previousStatus: existingForm.status,
        newStatus: result.status,
      },
    });

    // Safety check: Ensure form has an owner
    if (!result.ownerId) {
      console.error(`⚠️ Form ${id} has no ownerId - cannot sync to user dashboard`);
      return NextResponse.json({ 
        success: true, 
        data: result,
        warning: "Form updated but no owner found - user dashboard not synced"
      });
    }

    // 🔄 CRITICAL: Update user's submittedForms field to sync with dashboard
    // This ensures all admin changes reflect on user's dashboard
    try {
      const usersCollection = db.collection("users");
      
      // Get current player count from form
      const fields = result.fields as Record<string, unknown> | undefined;
      const playerFieldsArray = fields?.playerFields as Record<string, unknown>[] | undefined;
      const playerCount = playerFieldsArray?.length || 0;

      // Map form collection status to user dashboard status
      // Form collection: 'submitted', 'confirmed', 'draft', etc.
      // User submittedForms: 'not_confirmed' or 'confirmed'
      const formStatus = body.status || result.status || "submitted";
      const dashboardStatus = formStatus === "confirmed" ? "confirmed" : "not_confirmed";

      // Update user's submittedForms field with current data
      const updatePayload: Record<string, unknown> = {
        [`submittedForms.${result.title}.Players`]: playerCount,
        [`submittedForms.${result.title}.status`]: dashboardStatus,
        updatedAt: new Date()
      };
      
      console.log(`🔄 Status mapping: form='${formStatus}' → dashboard='${dashboardStatus}'`);

      // If this is the first form for this user, ensure submittedForms exists
      const userUpdateResult = await usersCollection.updateOne(
        { _id: result.ownerId },
        { $set: updatePayload },
        { upsert: false }
      );

      if (userUpdateResult.matchedCount > 0) {
        console.log(`👤 User dashboard synced: ${result.ownerId} → ${result.title}: ${playerCount} players (${dashboardStatus})`);
      } else {
        console.warn(`⚠️ User not found for ownerId: ${result.ownerId}`);
      }
    } catch (error) {
      console.error("⚠️ Failed to update user submittedForms:", error);
      // Don't fail the entire request if user update fails
    }

    // 🔄 Automatically update payment record if player count changed
    if (body.fields) {
      try {
        const paymentsCollection = db.collection("payments");
        const payment = await paymentsCollection.findOne({
          ownerId: result.ownerId,
          status: "verified"
        });

        if (payment) {
          // Calculate current player count from updated form
          const playerFields = Object.entries(body.fields).filter(
            ([key]) => key.startsWith("player") && !key.includes("coach")
          );

          // Get accommodation price
          const accommodationPrice = Number(body.fields.accommodation_price || payment.accommodation || 0);
          
          // Validate accommodation price
          if (accommodationPrice < 0) {
            console.error(`⚠️ Invalid accommodation price: ${accommodationPrice}`);
            throw new Error("Accommodation price cannot be negative");
          }
          
          // Calculate new total amount (₹800 per player + accommodation)
          const newTotalAmount = (playerFields.length * 800) + accommodationPrice;
          
          // Validate total amount
          if (newTotalAmount <= 0 || playerFields.length === 0) {
            console.error(`⚠️ Invalid payment calculation: ${playerFields.length} players, ₹${newTotalAmount}`);
            throw new Error("Invalid payment amount calculated");
          }

          // Update payment record
          const paymentData = payment.paymentData ? JSON.parse(payment.paymentData) : { submittedForms: {} };
          
          // Update the snapshot with current player count
          paymentData.submittedForms = paymentData.submittedForms || {};
          paymentData.submittedForms[result.title] = { Players: playerFields.length };

          await paymentsCollection.updateOne(
            { _id: payment._id },
            {
              $set: {
                amount: `₹${newTotalAmount}`,
                accommodation: accommodationPrice,
                paymentData: JSON.stringify(paymentData),
                updatedAt: new Date()
              }
            }
          );

          console.log(`💰 Payment updated: ${payment._id} → ₹${newTotalAmount} (${playerFields.length} players)`);
        }
      } catch (error) {
        console.error("⚠️ Failed to update payment:", error);
        // Don't fail the entire request if payment update fails
      }
    }

    // Trigger incremental Google Sheets sync (non-blocking with retry)
    const syncWithRetry = async (url: string, body: object, retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (response.ok) {
            console.log(`✅ Sync successful on attempt ${attempt}`);
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        } catch (err) {
          console.error(`❌ Sync attempt ${attempt}/${retries} failed:`, err);
          if (attempt < retries) {
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
          }
        }
      }
      console.error(`🚨 All sync attempts failed after ${retries} retries`);
    };

    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.ROOT_URL || 'http://localhost:3000';
      
      // Sync form record with retry
      syncWithRetry(
        `${baseUrl}/api/sync/incremental`,
        { collection: "form", recordId: id, sheetName: "Registrations" }
      ).catch(err => console.error("Background sync failed:", err));

      // Sync due payments with retry
      syncWithRetry(
        `${baseUrl}/api/sync/due-payments`,
        {}
      ).catch(err => console.error("Due payments sync failed:", err));
    } catch (error) {
      console.error("Error triggering sync:", error);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json(
      { error: "Failed to update form" },
      { status: 500 }
    );
  }
}
