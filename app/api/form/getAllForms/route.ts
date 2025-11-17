import { getEmailFromToken } from "@/app/utils/forms/getEmail";
import { playerFields } from "@/app/utils/forms/schema";
import { fetchUserData } from "@/app/utils/GetUpdateUser";
import { connectToDatabase } from "@/lib/mongodb";
import { Collection } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

// interface FormObj {
//   ownerId: Object;
//   fields?: Object;
//   createdAt: Date;
//   status:string;
//   updatedAt: Date;
//   title: string;
// }

// interface FetchUserResponse {
//   data: { _id: Object };
// }

export async function POST(req: NextRequest) {
  try {
    const email = getEmailFromToken(req);
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or email not found" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const formCollection: Collection = db.collection("form");

    const userResponse = await fetchUserData("email", email, ["_id"]);

    if (!userResponse.success || !userResponse.data?._id) {
      return NextResponse.json(
        { success: false, message: "Owner not found or invalid response" },
        { status: 404 }
      );
    }

    const ownerId = userResponse.data._id; // Safely access the _id property

    // Fetch specific fields (_id, title, updatedAt) for all documents matching ownerId
    const matchingForms = await formCollection
      .find({ ownerId }, { projection: { _id: 1, title: 1, updatedAt: 1,status:1, "fields.playerFields": 1 } })
      .toArray();

    return NextResponse.json(
      { success: true, data: matchingForms },
      { status: 200 }
    );
  } catch (error) {
    // console.error("Error in API handler:", error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON format" },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
