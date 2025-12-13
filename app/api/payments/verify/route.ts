import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sendPaymentConfirmedEmail } from "@/app/utils/mailer/PaymentConfirmedEmail";

/**
 * POST endpoint to handle registration confirmation webhook from Google Sheets
 * When "Send Email?" column is changed to "Yes", this sends confirmation email using registration-confirmed.html
 * 
 * Usage: POST /api/payments/verify
 * Body: { paymentId: string, sendEmail: "Yes" | "No" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, sendEmail } = body;

    // Validate input
    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { error: "Invalid payment ID format" },
        { status: 400 }
      );
    }

    // Only send email when sendEmail is "Yes"
    if (sendEmail !== "Yes") {
      return NextResponse.json(
        { success: true, message: "Send Email status updated, no email sent" },
        { status: 200 }
      );
    }

    const { db } = await connectToDatabase();
    const paymentsCollection = db.collection("payments");
    const usersCollection = db.collection("users");
    const formsCollection = db.collection("forms");

    // Get payment details
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(paymentId) });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Get user details
    const user = await usersCollection.findOne({ _id: payment.ownerId });

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      );
    }

    // Get submitted forms for this user to build payment data
    const userForms = await formsCollection.find({ 
      ownerId: payment.ownerId 
    }).toArray();

    // Build payment data JSON
    const submittedForms: Record<string, { Players: number }> = {};
    for (const form of userForms) {
      const playerFields = (form.fields as { playerFields?: unknown[] })?.playerFields || [];
      submittedForms[form.title] = {
        Players: playerFields.length
      };
    }

    // Send confirmation email
    await sendPaymentConfirmedEmail({
      name: user.name,
      email: user.email,
      universityName: user.universityName,
      paymentId: payment._id.toString(),
      transactionId: payment.transactionId,
      amountInNumbers: payment.amountInNumbers,
      amountInWords: payment.amountInWords,
      paymentDate: payment.paymentDate,
      paymentData: JSON.stringify({ submittedForms })
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration confirmation email sent successfully",
        email: user.email
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error in registration confirmation webhook:", error);
    return NextResponse.json(
      {
        error: "Failed to send registration confirmation email",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
