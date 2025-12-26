import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

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
