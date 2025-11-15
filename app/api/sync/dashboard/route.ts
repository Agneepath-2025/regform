import { getEmailFromToken } from "@/app/utils/forms/getEmail";
import { fetchUserData } from "@/app/utils/GetUpdateUser";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Extract email from token
    const email = getEmailFromToken(req);
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or email not found" },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    // Fetch user data
    const userResponse = await fetchUserData("email", email, ["name", "universityName","submittedForms","phone", "registrationDone", "paymentDone"]);
    
    if (!userResponse.success || !userResponse.data) {
      return NextResponse.json(
        { success: false, message: "User not found or invalid response" },
        { status: 404 }
      );
    }
    userResponse.data.email = email;
    // Respond with retrieved data
    return NextResponse.json(
      { success: true, data: userResponse.data },
      { status: 200 }
    );
  } catch (error) {
    // console.error("Error in API handler:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
