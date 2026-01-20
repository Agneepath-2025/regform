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
    
    if (owner) {
      // Process DMZ swaps for team owners
      for (const swap of swaps) {
        const isOwnerPlayer = 
          swap.oldPlayerData.email.toLowerCase() === (owner.email as string || '').toLowerCase() ||
          swap.oldPlayerData.phone === (owner.phone as string || '');

        if (isOwnerPlayer) {
          swapUserInDmz(swap.oldPlayerData.email, {
            email: swap.newPlayerData.email,
            name: swap.newPlayerData.name,
            phone: swap.newPlayerData.phone,
            university: (owner.universityName as string) || ''
          }).catch(err => {
            console.error("❌ Failed to swap player in DMZ:", err);
          });
          
          console.log(`🔄 DMZ swap triggered: ${swap.oldPlayerData.email} → ${swap.newPlayerData.email}`);
        }
      }
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
