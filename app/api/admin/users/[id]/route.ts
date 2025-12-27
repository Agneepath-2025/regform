import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { isValidObjectId } from "@/app/utils/security/input-validation";
import { logError } from "@/app/utils/security/error-handler";
import { addSecurityHeaders } from "@/app/utils/security/headers";
import { rateLimit } from "@/app/utils/rateLimit";
import { auth } from "@/auth";
import { z } from "zod";

const updateUserSchema = z.object({
  deleted: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(req, {
      windowMs: 60000,
      maxRequests: 50,
    });
    if (rateLimitResult) {
      return addSecurityHeaders(rateLimitResult);
    }

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return addSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    // Check admin role
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (!adminEmails.includes(session.user.email || '')) {
      return addSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Forbidden - Admin access required" },
          { status: 403 }
        )
      );
    }

    const { id } = await context.params;

    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return addSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Invalid user ID format" },
          { status: 400 }
        )
      );
    }

    // Validate request body
    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Invalid request body" },
          { status: 400 }
        )
      );
    }

    const validatedData = validation.data;
    const { db } = await connectToDatabase();

    // Support for soft delete and restore
    if (validatedData.deleted !== undefined) {
      const updateData: { deleted: boolean; deletedAt: Date | null } = {
        deleted: validatedData.deleted,
        deletedAt: validatedData.deleted ? new Date() : null,
      };

      const result = await db.collection("users").updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return addSecurityHeaders(
          NextResponse.json(
            { success: false, error: "User not found" },
            { status: 404 }
          )
        );
      }

      // Trigger incremental sync to Google Sheets
      const syncUrl = new URL("/api/sync/incremental", req.url);
      fetch(syncUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: "users",
          recordId: id,
          sheetName: "Users",
        }),
      }).catch((err) => logError(err, { context: "Google Sheets sync" }));

      return addSecurityHeaders(
        NextResponse.json({
          success: true,
          message: validatedData.deleted ? "User deleted successfully" : "User restored successfully",
        })
      );
    }

    return addSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      )
    );
  } catch (error) {
    logError(error, { endpoint: "/api/admin/users/[id]" });
    return addSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Failed to update user" },
        { status: 500 }
      )
    );
  }
}
