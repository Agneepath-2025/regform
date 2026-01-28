import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { syncRecordToSheet } from "@/app/utils/incremental-sync";
import { swapUserInDmz } from "@/app/utils/dmz-api";

interface BatchSwapRequest {
  swaps: Array<{
    playerIndex: number;
    oldPlayerData: {
      email: string;
      name: string;
      phone: string;
    };
    newPlayerData: {
      email: string;
      name: string;
      phone: string;
      date?: string;
      gender?: string;
      category1?: string;
      category2?: string;
      category3?: string;
      category4?: string;
    };
  }>;
}

/**
 * PATCH /api/admin/forms/[id]/batch-swap
 * 
 * Swaps multiple players in a submitted form at once
 * Updates: MongoDB, Google Sheets, and DMZ API
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: BatchSwapRequest = await request.json();

    const { swaps } = body;

    if (!Array.isArray(swaps) || swaps.length === 0) {
      return NextResponse.json(
        { error: "Invalid request body - swaps array required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const formsCollection = db.collection("form");

    // Fetch the form
    const form = await formsCollection.findOne({ _id: new ObjectId(id) });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Get player fields
    const fields = form.fields as Record<string, unknown> || {};
    const playerFields = (fields.playerFields as Record<string, unknown>[]) || [];

    // Validate all swaps before applying any
    const results: Array<{ success: boolean; index: number; error?: string }> = [];

    for (const swap of swaps) {
      const { playerIndex, oldPlayerData, newPlayerData } = swap;

      if (playerIndex < 0 || playerIndex >= playerFields.length) {
        results.push({
          success: false,
          index: playerIndex,
          error: "Invalid player index"
        });
        continue;
      }

      const existingPlayer = playerFields[playerIndex];
      
      // Verify old player data matches
      if (
        existingPlayer.email !== oldPlayerData.email ||
        existingPlayer.name !== oldPlayerData.name
      ) {
        results.push({
          success: false,
          index: playerIndex,
          error: "Player data mismatch"
        });
        continue;
      }

      // Apply the swap
      playerFields[playerIndex] = {
        ...existingPlayer,
        ...newPlayerData,
      };

      results.push({
        success: true,
        index: playerIndex
      });
    }

    // Check if all swaps were successful
    const failedSwaps = results.filter(r => !r.success);
    if (failedSwaps.length > 0) {
      return NextResponse.json(
        { 
          error: "Some swaps failed", 
          results,
          failedCount: failedSwaps.length,
          successCount: results.length - failedSwaps.length
        },
        { status: 400 }
      );
    }

    // Update in MongoDB
    const result = await formsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          "fields.playerFields": playerFields,
          updatedAt: new Date()
        }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to update form" },
        { status: 500 }
      );
    }

    console.log(`✅ ${swaps.length} players swapped in MongoDB`);

    // Sync to Google Sheets (non-blocking)
    syncRecordToSheet("form", id, "Registrations").catch(err => {
      console.error("❌ Failed to sync form to sheets after batch swap:", err);
    });

    // Get owner data for DMZ sync
    const owner = await db.collection("users").findOne({ _id: form.ownerId });
    
    if (owner && owner.universityName && result.status === 'submitted') {
      // 🔄 Optimized DMZ sync: Remove old players and add only new players
      // This avoids re-adding all existing players and reduces duplication risk
      console.log(`[DMZ] Batch swapping ${swaps.length} players in DMZ...`);
      import('@/app/utils/dmz-api').then(({ removeUserFromDmz, addUserToDmz }) => {
        // Remove all old players and add new players sequentially to avoid race conditions
        const swapPromises = swaps.map(async (swap) => {
          try {
            // First remove the old player
            await removeUserFromDmz(swap.oldPlayerData.email)
              .catch(err => console.error(`[DMZ] Failed to remove ${swap.oldPlayerData.email}:`, err));
            
            // Then add the new player
            await addUserToDmz({
              email: swap.newPlayerData.email,
              name: swap.newPlayerData.name,
              phone: swap.newPlayerData.phone,
              university: owner.universityName as string
            });
            
            console.log(`[DMZ] ✅ Swapped: ${swap.oldPlayerData.email} → ${swap.newPlayerData.email}`);
          } catch (err) {
            console.error(`[DMZ] ❌ Failed to swap ${swap.oldPlayerData.email} → ${swap.newPlayerData.email}:`, err);
          }
        });
        
        Promise.allSettled(swapPromises).then(() => {
          console.log(`[DMZ] Batch swap complete: ${swaps.length} players processed`);
        });
      });
    } else if (!owner?.universityName) {
      console.warn(`[DMZ] Cannot sync - university not found for owner: ${form.ownerId}`);
    } else if (result.status !== 'submitted') {
      console.log(`[DMZ] Skipping sync - form status is '${result.status}' (not submitted)`);
    }

    return NextResponse.json({
      success: true,
      message: `${swaps.length} players swapped successfully`,
      data: {
        formId: id,
        swapsCount: swaps.length,
        results,
        updatedAt: result.updatedAt
      }
    });

  } catch (error) {
    console.error("Error in batch swap:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
