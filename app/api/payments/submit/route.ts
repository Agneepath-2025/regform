import { NextRequest, NextResponse } from "next/server";
import { Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { getEmailFromToken } from "@/app/utils/forms/getEmail";
import { fetchUserData } from "@/app/utils/GetUpdateUser";
// unused imports removed
import { sendPaymentConfirmationEmail } from "@/app/utils/mailer/PaymentEmail";
import { syncPaymentSubmission } from "@/app/utils/sheets-event-sync";

// (removed unused helper `addFileToStrapiDatabase`)

// Interfaces for data
interface PaymentFormData {
  accommodationPrice?: number;
  accommodationPeople?: number;
  name?: string;
  email?: string;
  paymentMode: string;
  amountInNumbers: number;
  amountInWords: string;
  payeeName: string;
  transactionId: string;
  paymentDate: Date;
  paymentProof?: string;
  remarks?: string;
  paymentData: string;
  paymentId: string;
  universityName: string;
}
interface PaymentData {
  paymentMode: string;
  accommodationPeople?: number;
  accommodationPrice?: number;
  amountInNumbers: number;
  amountInWords: string;
  payeeName: string;
  transactionId: string;
  paymentDate: Date;
  paymentProof: ObjectId;
  strapiId?: ObjectId;
  remarks?: string;
  ownerId: ObjectId;
  status: string;
  createdAt: Date;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Validate authentication
    const email = getEmailFromToken(req);
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user data
    const userResponse = await fetchUserData("email", email, ["_id", "name", "universityName"]);
    if (!userResponse.success || !userResponse.data?._id) {
      return NextResponse.json(
        { success: false, message: "Owner not found" },
        { status: 404 }
      );
    }

    console.log(userResponse)

    // Connect to Mongo
    const { db } = await connectToDatabase();
    const paymentCollection = db.collection("payments");
    const bucket = new (await import("mongodb")).GridFSBucket(db, { bucketName: "payment-proofs" });

    // Handle file upload
    const file = formData.get("paymentProof") as File;
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "Payment proof file is required" },
        { status: 400 }
      );
    }

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
      metadata: {
        ownerEmail: email,
        ownerId: userResponse.data._id.toString(),
        contentType: file.type
      },
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await new Promise<void>((resolve, reject) => {
      uploadStream.write(buffer, (err) => {
        if (err) return reject(err);
        uploadStream.end(); // end without callback
      });

      uploadStream.on("finish", () => resolve());
      uploadStream.on("error", (err) => reject(err));
    });

    const paymentProofId = uploadStream.id;

    // Prepare payment data
    const paymentData: PaymentData = {
      ownerId: userResponse.data._id,
      paymentMode: formData.get("paymentMode") as string,
      amountInNumbers: Number(formData.get("amountInNumbers")),
      amountInWords: formData.get("amountInWords") as string,
      payeeName: formData.get("payeeName") as string,
      transactionId: formData.get("transactionId") as string,
      paymentDate: new Date(formData.get("paymentDate") as string),
      status: "In review",
      createdAt: new Date(),
      paymentProof: paymentProofId
    };

    // Optional fields
    const remarks = formData.get("remarks");
    if (remarks) paymentData.remarks = remarks as string;

    const acpeople = Number(formData.get("accommodationPeople"));
    if (acpeople) {
      paymentData.accommodationPeople = acpeople;
      paymentData.accommodationPrice = Number(formData.get("accommodationPrice"));
    }

    const result = await paymentCollection.insertOne(paymentData);
    const insertedId = result.insertedId.toString()

    // Sync to Google Sheets (event-driven, non-blocking)
    syncPaymentSubmission(insertedId).catch(err => {
      console.error("[Sheets] Payment sync failed (non-blocking):", err.message || err);
      // Don't throw - allow payment submission to succeed even if sheets sync fails
    });

    // Prepare email data
    const formDataObj: PaymentFormData = {
      name: userResponse.data?.name,
      email: email,
      paymentMode: formData.get("paymentMode") as string,
      amountInNumbers: parseFloat(formData.get("amountInNumbers") as string),
      amountInWords: formData.get("amountInWords") as string,
      payeeName: formData.get("payeeName") as string,
      transactionId: formData.get("transactionId") as string,
      paymentDate: new Date(formData.get("paymentDate") as string),
      paymentProof: formData.get("paymentProof")as string,
      accommodationPeople: Number(formData.get("accommodationPeople")),
      accommodationPrice: Number(formData.get("accommodationPrice")),
      remarks: formData.get("remarks") as string || undefined,
      paymentData: formData.get("paymentData") as string,
      paymentId: insertedId as string,
      universityName: userResponse.data.universityName as string
    };

    // Send email confirmation
    console.log("Sending confirmation email to:", email);
    console.log("Payment proof type:", typeof formDataObj.paymentProof);
    try {
      await sendPaymentConfirmationEmail(formDataObj);
    } catch (emailErr) {
      console.error("Email send failed (non-blocking):", emailErr);
      // Don't fail the entire request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment submitted successfully",
        paymentId: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in payment submission:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
