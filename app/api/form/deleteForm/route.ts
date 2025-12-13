import { getEmailFromToken } from "@/app/utils/forms/getEmail";
import { connectToDatabase } from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { fetchUserData } from "@/app/utils/GetUpdateUser";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data || !data.id || !data.title) {
      return NextResponse.json(
        { success: false, message: "Invalid request: missing id or title" },
        { status: 400 }
      );
    }

    const email = getEmailFromToken(req);
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const formCollection: Collection = db.collection("form");

    // Fetch user id
    const userResponse = await fetchUserData("email", email, ["_id"]);

    if (!userResponse.success || !userResponse.data?._id) {
      return NextResponse.json(
        { success: false, message: "Owner not found" },
        { status: 404 }
      );
    }

    const ownerId = userResponse.data._id;

    // Validate the form exists and belongs to the user
    const form = await formCollection.findOne({
      _id: new ObjectId(data.id),
      ownerId,
      title: data.title,
    });

    if (!form) {
      return NextResponse.json(
        { success: false, message: "Form not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the form
    await formCollection.deleteOne({
      _id: new ObjectId(data.id),
      ownerId,
      title: data.title,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Form deleted successfully",
        deletedId: data.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
