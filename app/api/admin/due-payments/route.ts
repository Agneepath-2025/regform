import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface DuePaymentRecord {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  universityName: string;
  paymentId: string;
  transactionId: string;
  originalPlayerCount: number;
  currentPlayerCount: number;
  playerDifference: number;
  amountDue: number;
  status: string;
  lastUpdated: Date;
  forms: Array<{
    formId: string;
    sport: string;
    originalPlayers: number;
    currentPlayers: number;
    difference: number;
  }>;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const paymentsCollection = db.collection("payments");
    const formsCollection = db.collection("form");
    const usersCollection = db.collection("users");

    // Get all verified payments
    const payments = await paymentsCollection
      .find({ status: "verified" })
      .toArray();

    const duePayments: DuePaymentRecord[] = [];

    for (const payment of payments) {
      if (!payment.ownerId) continue;

      // Get user details
      const user = await usersCollection.findOne({ _id: payment.ownerId });
      if (!user) continue;

      // Get all forms for this user
      const userForms = await formsCollection
        .find({ ownerId: payment.ownerId })
        .toArray();

      let totalOriginalPlayers = 0;
      let totalCurrentPlayers = 0;
      const formDetails: Array<{
        formId: string;
        sport: string;
        originalPlayers: number;
        currentPlayers: number;
        difference: number;
      }> = [];

      // Calculate player counts for each form
      for (const form of userForms) {
        const fields = form.fields as Record<string, unknown> | undefined;
        const currentPlayerFields = (fields?.playerFields as Record<string, unknown>[]) || [];
        const currentPlayers = currentPlayerFields.length;

        // Get original player count from payment snapshot (if available)
        let originalPlayers = currentPlayers;
        
        // Check if we have a payment snapshot for this specific form
        const paymentData = payment.paymentData ? 
          (typeof payment.paymentData === 'string' ? 
            JSON.parse(payment.paymentData) : 
            payment.paymentData) : 
          null;

        if (paymentData?.submittedForms?.[form.title]) {
          // Use snapshot if available
          originalPlayers = paymentData.submittedForms[form.title].Players || currentPlayers;
        } else {
          // FALLBACK: Calculate from payment amount for legacy payments
          // If no snapshot exists, calculate total original players from payment amount
          const totalAmountPaid = payment.amountInNumbers || payment.amount || 0;
          const accommodationPrice = payment.accommodationPrice || 0;
          const sportsPayment = totalAmountPaid - accommodationPrice;
          const calculatedTotalPlayers = Math.floor(sportsPayment / 800);
          
          // For this form, estimate proportionally based on current distribution
          // This is not perfect but better than using current count as baseline
          if (calculatedTotalPlayers > 0 && totalCurrentPlayers > 0) {
            // Don't assign yet, we'll do it after counting all current players
            originalPlayers = -1; // Flag for later calculation
          } else {
            originalPlayers = currentPlayers;
          }
        }

        const difference = originalPlayers >= 0 ? currentPlayers - originalPlayers : 0;

        if (difference !== 0 || originalPlayers === -1) {
          formDetails.push({
            formId: form._id.toString(),
            sport: form.title,
            originalPlayers: originalPlayers >= 0 ? originalPlayers : 0,
            currentPlayers,
            difference: originalPlayers >= 0 ? difference : 0
          });
        }

        if (originalPlayers >= 0) {
          totalOriginalPlayers += originalPlayers;
        }
        totalCurrentPlayers += currentPlayers;
      }

      // Second pass: Calculate original players for legacy payments
      if (formDetails.some(f => f.originalPlayers === 0 && totalOriginalPlayers === 0)) {
        const totalAmountPaid = payment.amountInNumbers || payment.amount || 0;
        const accommodationPrice = payment.accommodationPrice || 0;
        const sportsPayment = totalAmountPaid - accommodationPrice;
        const calculatedTotalPlayers = Math.floor(sportsPayment / 800);
        
        if (calculatedTotalPlayers > 0 && totalCurrentPlayers > 0) {
          // Distribute proportionally
          totalOriginalPlayers = calculatedTotalPlayers;
          formDetails.forEach(detail => {
            if (detail.originalPlayers === 0) {
              detail.originalPlayers = Math.round((detail.currentPlayers / totalCurrentPlayers) * calculatedTotalPlayers);
              detail.difference = detail.currentPlayers - detail.originalPlayers;
            }
          });
        }
      }

      const playerDifference = totalCurrentPlayers - totalOriginalPlayers;

      // Only add to due payments if there's a positive difference (more players added)
      if (playerDifference > 0) {
        duePayments.push({
          _id: payment._id.toString(),
          userId: payment.ownerId.toString(),
          userName: user.name || "N/A",
          userEmail: user.email || "N/A",
          universityName: user.universityName || "N/A",
          paymentId: payment._id.toString(),
          transactionId: payment.transactionId || "N/A",
          originalPlayerCount: totalOriginalPlayers,
          currentPlayerCount: totalCurrentPlayers,
          playerDifference,
          amountDue: playerDifference * 800,
          status: "pending",
          lastUpdated: new Date(),
          forms: formDetails
        });
      }
    }

    return NextResponse.json({ success: true, data: duePayments });
  } catch (error) {
    console.error("Error fetching due payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch due payments" },
      { status: 500 }
    );
  }
}
