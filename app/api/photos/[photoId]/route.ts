import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId, GridFSBucket } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: { photoId: string } }
) {
  const { db } = await connectToDatabase();
  const bucket = new GridFSBucket(db, { bucketName: "player-image" });
  const id = new ObjectId(params.photoId);

  const files = await bucket.find({ _id: id }).toArray();
  if (!files.length) return new Response("File not found", { status: 404 });

  const file = files[0];
  const contentType = file.metadata?.contentType || "image/jpeg";

  const nodeStream = bucket.openDownloadStream(id);

  // Convert Node stream → Web ReadableStream
  const readableStream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
