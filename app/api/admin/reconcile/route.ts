import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * POST /api/admin/reconcile
 * 
 * Reconciliation endpoint to fix data inconsistencies
 * Syncs form collection data back to users.submittedForms
 * Should be run periodically or when inconsistencies are detected
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const formsCollection = db.collection("form");
    const usersCollection = db.collection("users");

    console.log("🔄 Starting data reconciliation...");

    // Get all forms
    const allForms = await formsCollection.find({}).toArray();
    
    const updates: {
      userId: string;
      sport: string;
      players: number;
      status: string;
    }[] = [];
    
    const errors: string[] = [];
    let successCount = 0;

    // Group forms by owner
    const formsByOwner = new Map<string, typeof allForms>();
    for (const form of allForms) {
      if (!form.ownerId) continue;
      const ownerIdStr = form.ownerId.toString();
      if (!formsByOwner.has(ownerIdStr)) {
        formsByOwner.set(ownerIdStr, []);
      }
      formsByOwner.get(ownerIdStr)!.push(form);
    }

    console.log(`📊 Found ${formsByOwner.size} users with forms`);

    // Update each user's submittedForms
    for (const [ownerIdStr, userForms] of formsByOwner.entries()) {
      try {
        const updatePayload: Record<string, unknown> = {};
        
        for (const form of userForms) {
          const fields = form.fields as Record<string, unknown> | undefined;
          const playerFieldsArray = fields?.playerFields as Record<string, unknown>[] | undefined;
          const playerCount = playerFieldsArray?.length || 0;
          
          // Map form status to dashboard status
          const formStatus = form.status || "submitted";
          const dashboardStatus = formStatus === "confirmed" ? "confirmed" : "not_confirmed";
          
          updatePayload[`submittedForms.${form.title}.Players`] = playerCount;
          updatePayload[`submittedForms.${form.title}.status`] = dashboardStatus;
          
          updates.push({
            userId: ownerIdStr,
            sport: form.title as string,
            players: playerCount,
            status: dashboardStatus
          });
        }
        
        if (Object.keys(updatePayload).length > 0) {
          await usersCollection.updateOne(
            { _id: userForms[0].ownerId },
            { $set: { ...updatePayload, updatedAt: new Date() } }
          );
          successCount++;
        }
      } catch (error) {
        const errorMsg = `Failed to update user ${ownerIdStr}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`✅ Reconciliation complete: ${successCount}/${formsByOwner.size} users updated`);

    return NextResponse.json({
      success: true,
      message: "Reconciliation complete",
      stats: {
        totalUsers: formsByOwner.size,
        successfulUpdates: successCount,
        failedUpdates: errors.length,
        totalUpdates: updates.length
      },
      updates: updates.slice(0, 10), // Return first 10 as sample
      errors: errors.slice(0, 10) // Return first 10 errors
    });

  } catch (error) {
    console.error("Error in reconciliation:", error);
    return NextResponse.json(
      { error: "Reconciliation failed", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
