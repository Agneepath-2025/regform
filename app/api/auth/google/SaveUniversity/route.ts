/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getEmailFromToken } from "@/app/utils/forms/getEmail"; // Utility to extract email from JWT
import { sendSignupConfirmationEmail } from "@/app/utils/mailer/SignupEmail";
import { syncUserRegistration } from "@/app/utils/sheets-event-sync";
export async function POST(req: NextRequest) {
    try {
        // Step 1: Extract the token from the request cookies
        const email = getEmailFromToken(req);
        if (!email) {
            return NextResponse.json(
                { success: false, message: "Invalid or expired token." },
                { status: 401 }
            );
        }

        // Step 2: Validate and extract data from request body
        const { universityName,phone } = await req.json();
        if (!universityName) {
            return NextResponse.json(
                { success: false, message: "University name is required." },
                { status: 400 }
            );
        }
        if (!phone) {
            return NextResponse.json(
                { success: false, message: "Phone Number is required." },
                { status: 400 }
            );
        }

        // Step 3: Connect to MongoDB
        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");

        // Step 4: Check if the user exists in the database
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found." },
                { status: 404 }
            );
        }

        // Step 5: Update the user's university name
        const updateResult = await usersCollection.updateOne(
            { email },
            { $set: { universityName,phone } }
        );

        // Step 6: Send signup confirmation email after university is saved
        if (updateResult.modifiedCount > 0) {
            // Send signup email now that we have complete information (non-blocking)
            sendSignupConfirmationEmail({
                name: user.name,
                email: email.toLowerCase(),
                universityName,
                signupMethod: "google",
            }).catch((err) => console.error("Sending signup email failed:", err));

            // Sync updated user to Google Sheets (non-blocking)
            syncUserRegistration(user._id.toString()).catch(err => {
                console.error("[Sheets] Failed to sync user after university update:", err);
            });

            return NextResponse.json({
                success: true,
                message: "University name saved successfully.",
            });
        } else {
            return NextResponse.json({
                success: false,
                message: "Failed to update university name.",
            });
        }
    } catch (error) {
        // console.error("Error in saving university name:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error." },
            { status: 500 }
        );
    }
}
