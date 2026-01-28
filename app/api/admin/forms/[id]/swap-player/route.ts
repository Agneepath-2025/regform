import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { syncRecordToSheet } from "@/app/utils/incremental-sync";
import { swapUserInDmz } from "@/app/utils/dmz-api";

interface SwapPlayerRequest {
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
}

/**
 * PATCH /api/admin/forms/[id]/swap-player
 * 
 * Swaps player details in a submitted form
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
    const body: SwapPlayerRequest = await request.json();

    const { playerIndex, oldPlayerData, newPlayerData } = body;

    if (typeof playerIndex !== 'number' || !oldPlayerData || !newPlayerData) {
      return NextResponse.json(
        { error: "Invalid request body" },
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

    if (playerIndex < 0 || playerIndex >= playerFields.length) {
      return NextResponse.json(
        { error: "Invalid player index" },
        { status: 400 }
      );
    }

    // Verify old player data matches (security check)
    const existingPlayer = playerFields[playerIndex];
    if (
      existingPlayer.email !== oldPlayerData.email ||
      existingPlayer.name !== oldPlayerData.name
    ) {
      return NextResponse.json(
        { error: "Player data mismatch - cannot verify swap" },
        { status: 400 }
      );
    }

    // Update the player at the specified index
    playerFields[playerIndex] = {
      ...existingPlayer,
      ...newPlayerData,
      // Preserve any additional fields
    };

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

    console.log(`✅ Player swapped in MongoDB: ${oldPlayerData.email} → ${newPlayerData.email}`);

    // Sync to Google Sheets (non-blocking)
    syncRecordToSheet("form", id, "Registrations").catch(err => {
      console.error("❌ Failed to sync form to sheets after player swap:", err);
    });

    // Get owner data for DMZ sync
    const owner = await db.collection("users").findOne({ _id: form.ownerId });
    
    if (owner && owner.universityName && result.status === 'submitted') {
      // 🔄 Optimized DMZ sync: Remove old player and add only the new player
      // This avoids re-adding all existing players and reduces duplication risk
      console.log(`[DMZ] Swapping player in DMZ: ${oldPlayerData.email} → ${newPlayerData.email}`);
      import('@/app/utils/dmz-api').then(({ removeUserFromDmz, addUserToDmz }) => {
        // First remove the old player
        removeUserFromDmz(oldPlayerData.email)
          .catch(err => console.error(`[DMZ] Failed to remove old player ${oldPlayerData.email}:`, err))
          .finally(() => {
            // Then add only the new player
            addUserToDmz({
              email: newPlayerData.email,
              name: newPlayerData.name,
              phone: newPlayerData.phone,
              university: owner.universityName as string
            })
              .then(() => console.log(`[DMZ] ✅ Player swapped successfully: ${oldPlayerData.email} → ${newPlayerData.email}`))
              .catch(err => console.error(`[DMZ] ❌ Failed to add new player ${newPlayerData.email}:`, err));
          });
      });
    } else if (!owner?.universityName) {
      console.warn(`[DMZ] Cannot sync - university not found for owner: ${form.ownerId}`);
    } else if (result.status !== 'submitted') {
      console.log(`[DMZ] Skipping sync - form status is '${result.status}' (not submitted)`);
    }

    return NextResponse.json({
      success: true,
      message: "Player swapped successfully",
      data: {
        formId: id,
        oldPlayer: oldPlayerData,
        newPlayer: newPlayerData,
        updatedAt: result.updatedAt
      }
    });

  } catch (error) {
    console.error("Error swapping player:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
