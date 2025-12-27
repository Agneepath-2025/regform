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
    const paymentsCollection = db.collection("payments");

    // Fetch all payments with user information
    const payments = await paymentsCollection
      .aggregate([
        {
          $addFields: {
            ownerObjectId: { $toObjectId: "$ownerId" }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "ownerObjectId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            userId: "$ownerId",
            transactionId: 1,
            amount: "$amountInNumbers",
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            userName: "$user.name",
            userEmail: "$user.email",
            universityName: "$user.universityName",
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
