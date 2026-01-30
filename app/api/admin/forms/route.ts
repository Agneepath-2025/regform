import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const formsCollection = db.collection("form");

    // Fetch all forms with owner details
    const forms = await formsCollection
      .aggregate([
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
        {
          $project: {
            _id: 1,
            title: 1,
            status: 1,
            fields: 1,
            createdAt: 1,
            updatedAt: 1,
            "owner.name": 1,
            "owner.email": 1,
            "owner.universityName": 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: forms });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, ownerId, createUser = false, userData, status = "draft" } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Title is required" },
        { status: 400 }
      );
    }

    if (!createUser && !ownerId) {
      return NextResponse.json(
        { success: false, message: "Either ownerId or userData is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const formsCollection = db.collection("form");
    const usersCollection = db.collection("users");

    let ownerObjectId: ObjectId;
    let createdUserId: string | undefined;

    // If creating a new user
    if (createUser && userData) {
      const { name, email, phone, universityName } = userData;

      if (!name || !email || !universityName) {
        return NextResponse.json(
          { success: false, message: "Name, email, and university name are required for new user" },
          { status: 400 }
        );
      }

      // Check if user with this email already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "User with this email already exists" },
          { status: 400 }
        );
      }

      // Create new user
      const newUser = {
        name,
        email,
        phone: phone || "",
        universityName,
        emailVerified: true, // Auto-verify for admin-created users
        registrationDone: false,
        paymentDone: false,
        submittedForms: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userResult = await usersCollection.insertOne(newUser);
      ownerObjectId = userResult.insertedId;
      createdUserId = userResult.insertedId.toString();
    } else {
      // Use existing user
      ownerObjectId = new ObjectId(ownerId);

      // Check if user exists
      const user = await usersCollection.findOne({ _id: ownerObjectId });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }
    }

    // Check if form with same title already exists for this user
    const existingForm = await formsCollection.findOne({
      title,
      ownerId: ownerObjectId
    });

    if (existingForm) {
      return NextResponse.json(
        { success: false, message: "A form for this sport already exists for this user" },
        { status: 400 }
      );
    }

    // Create new form
    const newForm = {
      ownerId: ownerObjectId,
      title,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: {
        playerFields: [],
        coachFields: {}
      }
    };

    const result = await formsCollection.insertOne(newForm);

    return NextResponse.json({
      success: true,
      message: createUser ? "User and form created successfully" : "Form created successfully",
      formId: result.insertedId.toString(),
      userId: createdUserId
    });
  } catch (error) {
    console.error("Error creating form:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create form" },
      { status: 500 }
    );
  }
}
