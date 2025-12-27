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
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(id) });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
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
    const usersCollection = db.collection("users");

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Allow updating specific fields
    const allowedFields = [
      "name",
      "email",
      "phone",
      "universityName",
      "emailVerified",
      "registrationDone",
      "paymentDone",
      "submittedForms",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update corresponding forms collection if submittedForms changed
    if (body.submittedForms) {
      const formsCollection = db.collection("form");
      const userId = new ObjectId(id);

      // Update or create form documents for each sport
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const [sportKey, sportData] of Object.entries(body.submittedForms as Record<string, any>)) {
        const formData = {
          ownerId: userId,
          title: sportData.title || sportKey,
          status: sportData.status || "draft",
          fields: sportData.fields || {},
          updatedAt: new Date(),
        };

        // Try to find existing form for this user and sport
        const existingForm = await formsCollection.findOne({
          ownerId: userId,
          title: formData.title,
        });

        if (existingForm) {
          // Update existing form
          await formsCollection.updateOne(
            { _id: existingForm._id },
            { $set: formData }
          );
        } else {
          // Create new form
          await formsCollection.insertOne({
            ...formData,
            createdAt: new Date(),
          });
        }
      }
    }

    // Trigger incremental Google Sheets sync (non-blocking)
    try {
      // Sync only this specific user record
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sync/incremental`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          collection: "users",
          recordId: id,
          sheetName: "Users"
        }),
      }).catch(err => console.error("Background sync failed:", err));

      // Also sync forms if submittedForms changed
      if (body.submittedForms) {
        // Sync all affected form records
        const formsCollection = db.collection("form");
        const userForms = await formsCollection.find({ ownerId: new ObjectId(id) }).toArray();
        userForms.forEach(form => {
          fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sync/incremental`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              collection: "form",
              recordId: form._id.toString(),
              sheetName: "Registrations"
            }),
          }).catch(err => console.error("Form sync failed:", err));
        });
      }
    } catch (error) {
      console.error("Error triggering sync:", error);
      // Don't fail the request if sync fails
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
