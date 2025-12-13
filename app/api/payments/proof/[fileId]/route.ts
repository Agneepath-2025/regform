import { connectToDatabase } from "@/lib/mongodb";
import { GridFSBucket, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET endpoint to download payment proof files from GridFS
 * Publicly accessible - anyone with the link can view
 * Usage: /api/payments/proof/[fileId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // 1. Validate fileId
    if (!fileId || !ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { success: false, message: "Invalid file ID" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 5. Access GridFS bucket
    const bucket = new GridFSBucket(db, { bucketName: "payment-proofs" });

    // Check if file exists
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: "Payment proof not found" },
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
      { success: false, message: "Failed to download payment proof" },
      { status: 500 }
    );
  }
}
