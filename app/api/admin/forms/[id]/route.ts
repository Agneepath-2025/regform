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

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Allow updating specific fields
    if (body.status) {
      updateData.status = body.status;
    }

    if (body.fields) {
      updateData.fields = body.fields;
    }

    const result = await formsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
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
          const accommodationPrice = body.fields.accommodation_price || payment.accommodation || 0;
          
          // Calculate new total amount (₹800 per player + accommodation)
          const newTotalAmount = (playerFields.length * 800) + Number(accommodationPrice);

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

    // Trigger incremental Google Sheets sync (non-blocking)
    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.ROOT_URL || 'http://localhost:3000';
      
      // Sync only this specific form record
      fetch(`${baseUrl}/api/sync/incremental`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          collection: "form",
          recordId: id,
          sheetName: "Registrations"
        }),
      }).catch(err => console.error("Background sync failed:", err));

      // Also trigger due payments sync to update outstanding amounts
      fetch(`${baseUrl}/api/sync/due-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(err => console.error("Due payments sync failed:", err));
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
