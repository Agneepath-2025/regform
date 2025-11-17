import { getEmailFromToken } from "@/app/utils/forms/getEmail";
import { fetchUserData } from "@/app/utils/GetUpdateUser";
import { connectToDatabase } from "@/lib/mongodb";
import { Collection } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-unused-vars */

export async function POST(req: NextRequest) {
  try {
    const email = getEmailFromToken(req);
    if (!email) {
      // console.error("Unauthorized: Invalid token or email not found");
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or email not found" },
        { status: 401 }
      );
    }

    const userResponse = await fetchUserData("email", email, ["_id", "Accommodation", "submittedForms"]);

    if (!userResponse.success || !userResponse.data?._id) {
      return NextResponse.json(
        { success: false, message: "Owner not found or invalid response" },
        { status: 404 }
      );
    }
    const ownerId = userResponse.data._id;
    const { db } = await connectToDatabase();
    // Safely access the _id property
    const formCollection: Collection = db.collection("payments");

    // Fetch specific fields (_id, title, updatedAt) for all documents matching ownerId
    const matchingForms = await formCollection
      .find({ ownerId }, { projection: { createdAt: 1, transactionId: 1, amountInNumbers: 1, status: 1 } })
      .toArray();
    const { _id, ...userDataWithoutId } = userResponse.data;

    if (userResponse.success) {
      // console.log("User data retrieved successfully:", userResponse.data);
      return NextResponse.json(
        {
          success: true,
          message: "User data retrieved successfully",
          data: userDataWithoutId,
          form: matchingForms
        },
        { status: 200 }
      );
    } else {
      // // console.error("Failed to retrieve user data:", userResponse.message);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to retrieve user data",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    // console.error("Error in API handler:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
