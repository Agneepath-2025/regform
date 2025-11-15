import { getEmailFromToken } from "@/app/utils/forms/getEmail";
import { connectToDatabase } from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { fetchUserData } from "@/app/utils/GetUpdateUser";

type UserDoc = {
  _id?: string | { $oid?: string } | { _id?: string };
  email?: string;
  registrationDone?: boolean | null;
  [key: string]: unknown;
};

type FetchUserResponse = {
  success: boolean;
  data?: UserDoc | null;
};

type FindOneAndUpdateResult = { value?: UserDoc } | UserDoc | null;

export async function POST(req: NextRequest) {
  try {
    const email = getEmailFromToken(req);
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or email not found" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCollection: Collection = db.collection("users");

    const userResponse = (await fetchUserData(
      "email",
      email,
      ["_id", "email"]
    )) as FetchUserResponse;
    console.log("fetchUserData result:", JSON.stringify(userResponse));

    if (!userResponse.success || !userResponse.data) {
      return NextResponse.json(
        { success: false, message: "User not found or invalid response" },
        { status: 404 }
      );
    }

    const rawId = userResponse.data._id;
    let query: Record<string, unknown> = {};

    // normalize possible _id shapes into a string
    let idStr = "";
    if (!rawId) {
      idStr = "";
    } else if (typeof rawId === "string") {
      idStr = rawId;
    } else if (typeof rawId === "object" && rawId !== null) {
      if (typeof (rawId as { $oid?: string }).$oid === "string") {
        idStr = (rawId as { $oid?: string }).$oid as string;
      } else if (typeof (rawId as { _id?: string })._id === "string") {
        idStr = (rawId as { _id?: string })._id as string;
      } else {
        try {
          idStr = String(rawId);
        } catch {
          idStr = "";
        }
      }
    }

    if (idStr) {
      try {
        query = { _id: new ObjectId(idStr) };
      } catch (err) {
        console.warn(
          "Could not convert idStr to ObjectId, falling back to email. idStr:",
          idStr,
          err
        );
        query = { email };
      }
    } else {
      query = { email };
    }

    const update = { $set: { registrationDone: true, updatedAt: new Date() } };

    const rawResult = (await usersCollection.findOneAndUpdate(
      query,
      update,
      { returnDocument: "after" }
    )) as FindOneAndUpdateResult;

    // normalize result: Mongo driver may return { value: doc } or doc directly
    let updatedDoc: UserDoc | null = null;
    if (rawResult && typeof rawResult === "object" && "value" in rawResult) {
      updatedDoc = (rawResult as { value?: UserDoc }).value ?? null;
    } else {
      updatedDoc = (rawResult as UserDoc) ?? null;
    }

    console.log("Primary update normalized:", !!updatedDoc, updatedDoc);

    if (!updatedDoc || (!updatedDoc._id && !updatedDoc.email)) {
      console.warn(
        "Primary update did not match a document. Attempting fallback update by email."
      );
      const fallbackRaw = (await usersCollection.findOneAndUpdate(
        { email },
        update,
        { returnDocument: "after" }
      )) as FindOneAndUpdateResult;

      let fallback: UserDoc | null = null;
      if (fallbackRaw && typeof fallbackRaw === "object" && "value" in fallbackRaw) {
        fallback = (fallbackRaw as { value?: UserDoc }).value ?? null;
      } else {
        fallback = (fallbackRaw as UserDoc) ?? null;
      }

      console.log("Fallback update normalized:", !!fallback, fallback);
      if (!fallback || (!fallback._id && !fallback.email)) {
        return NextResponse.json(
          { success: false, message: "Failed to update registration status" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, message: "Registration completed (fallback)", data: fallback },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration completed successfully",
        data: updatedDoc,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in completeRegistration:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}