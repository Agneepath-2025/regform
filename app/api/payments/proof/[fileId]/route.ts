import { connectToDatabase } from "@/lib/mongodb";
import { GridFSBucket, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getEmailFromToken } from "@/app/utils/forms/getEmail";
import { fetchUserData } from "@/app/utils/GetUpdateUser";

/**
 * GET endpoint to download payment proof files from GridFS
 * Requires authentication - users can only access their own payment proofs or admins can access all
 * Usage: /api/payments/proof/[fileId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // 1. Authentication check
    const email = getEmailFromToken(request);
    if (!email) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token or not logged in" },
        { status: 401 }
      );
    }

    // 2. Get user data
    const userResponse = await fetchUserData("email", email, ["_id"]);
    if (!userResponse.success || !userResponse.data?._id) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    const userId = userResponse.data._id;

    // 3. Validate fileId
    if (!fileId || !ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { error: "Invalid file ID" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 4. Check if user owns the payment associated with this proof
    // or if user is an admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isAdmin = adminEmails.length > 0 && adminEmails.includes(email);
    
    if (!isAdmin) {
      // Verify ownership: find payment with this paymentProof and check if ownerId matches
      const payment = await db.collection("payments").findOne({ 
        paymentProof: new ObjectId(fileId) 
      });
      
      if (!payment) {
        return NextResponse.json(
          { error: "Payment proof not found" },
          { status: 404 }
        );
      }
      
      if (payment.ownerId?.toString() !== userId.toString()) {
        return NextResponse.json(
          { error: "Forbidden: You don't have permission to access this payment proof" },
          { status: 403 }
        );
      }
    }

    // 5. Access GridFS bucket
    const bucket = new GridFSBucket(db, { bucketName: "payment-proofs" });

    // Check if file exists
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Payment proof not found" },
        { status: 404 }
      );
    }

    const file = files[0];

    // Stream the file directly without loading into memory
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    // Convert GridFS stream to ReadableStream for NextResponse
    const readableStream = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        downloadStream.on("end", () => {
          controller.close();
        });
        downloadStream.on("error", (err) => {
          controller.error(err);
        });
      },
    });

    // Return file with appropriate headers
    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${file.filename || 'payment-proof'}"`,
        "Content-Length": file.length?.toString() || "",
      },
    });

  } catch (error) {
    console.error("[Payment Proof] Download error:", error);
    return NextResponse.json(
      { error: "Failed to download payment proof" },
      { status: 500 }
    );
  }
}
