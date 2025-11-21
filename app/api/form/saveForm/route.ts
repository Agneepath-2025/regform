/* eslint-disable @typescript-eslint/no-wrapper-object-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getEmailFromToken } from "@/app/utils/forms/getEmail";
import { connectToDatabase } from "@/lib/mongodb";
import { Collection, ObjectId, GridFSBucket } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { fetchUserData } from "@/app/utils/GetUpdateUser";
import { createErrorResponse, User } from "@/app/utils/interfaces";
import sendConfirmationEmail from "@/app/utils/mailer/ConfirmationMail";
/* eslint-disable @typescript-eslint/no-unused-vars */

interface FormObj {
  ownerId: Object;
  fields: Object;
  createdAt: Date;
  status: string;
  updatedAt: Date;
  title: string;
}
interface UpdateResponse {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

function setDeep(
  obj: Record<string, any>,
  path: string,
  value: any
): void {
  const parts: string[] = path
    .replace(/\]/g, "")
    .split(/[\.\[]/); 
    
  let current: any = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
    if (current === undefined) {
      throw new Error(`Invalid path segment: ${parts[i]} in ${path}`);
    }
  }

  current[parts[parts.length - 1]] = value;
}


function typecastDatesInPlayerFields(playerFields: Record<string, object>[]) {
  playerFields.forEach((obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string" && !isNaN(Date.parse(obj[key]))) {
        console.log("DATE: ", obj[key])
        obj[key] = new Date(obj[key]); // Convert string to Date
      }
    }
  });
}

async function updateUserData(email: string, data: Partial<User>) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("users");

    // Ensure the email is provided and valid
    if (!email) {
      return createErrorResponse(400, "Email is required.");
    }

    // Prepare the update operation to merge fields
    const updateData = Object.entries(data).reduce<Record<string,any>>((acc, [key, value]) => {
      if (typeof value === "object" && value !== null) {
        // Use $mergeObjects for nested fields
        acc[key] = { $mergeObjects: ["$" + key, value] };
      } else {
        // Use $set for primitive fields
        acc[key] = value;
      }
      return acc;
    }, {});

    // Perform the update operation
    const result = await collection.updateOne(
      { email }, // Search by email
      [{
        $set: updateData, // Merge or set fields
      }],
      { upsert: true } // Create if not found
    );

    // Consider the operation successful if we either:
    // 1. Created a new document (upsertedCount > 0)
    // 2. Modified an existing document (modifiedCount > 0)
    // 3. Found the document but no changes were needed (matchedCount > 0)
    if (result.upsertedCount > 0 || result.modifiedCount > 0 || result.matchedCount > 0) {
      return { 
        success: true, 
        message: result.upsertedCount > 0 
          ? "User created successfully."
          : "User updated successfully.",
        data: updateData 
      };
    }

    // Only return error if no document was found/matched at all
    return createErrorResponse(404, "User not found.");
  } catch (error) {
    // console.error("Error updating user data:", error);
    return createErrorResponse(500, "Failed to update user data.");
  }
}

export async function POST(req: NextRequest) {
  const { db } = await connectToDatabase();
  const bucket = new GridFSBucket(db, { bucketName: "player-image" });
  try {
    // Ensure the request has a JSON body
    const data = await req.formData();
    if (!data) {
      return NextResponse.json(
        { success: false, message: "Invalid or empty data" },
        { status: 400 }
      );
    }

    const uploadedFiles: Record<string, File> = {};

    for (const [key, value] of data.entries()) {
      if (value instanceof File && value.size > 0) {
        uploadedFiles[key] = value;
      }
    }

    //const { formId, fields, isDraft } = data;
    const formId = data.get("formId") as string;
    const isDraft = data.get("isDraft") === "true";

    const fieldsJson = data.get("fields") as string;
    const fields = JSON.parse(fieldsJson);


    for (const [path, file] of Object.entries(uploadedFiles)) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${formId}_${path.replace(/[\[\]\.]/g, "_")}_${Date.now()}.jpg`;

      const uploadStream = bucket.openUploadStream(filename, {
        metadata: { 
          formId, 
          fieldPath: path, 
          contentType: file.type.startsWith("image/") ? file.type : "image/jpeg"
        },
      });

      uploadStream.end(buffer);

      const uploadedFileId: ObjectId = await new Promise((resolve, reject) => {
        uploadStream.on("finish", () => resolve(uploadStream.id));
        uploadStream.on("error", reject);
      });

      setDeep(fields, path, uploadedFileId.toString());
      console.log("DEBUG playerFields BEFORE TYPECAST:", fields.playerFields);
      console.log("DEBUG playerFields BEFORE TYPECAST:", fields);

    }


    if (!formId || !fields || typeof isDraft !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Form ID, fields, and isDraft are required" },
        { status: 400 }
      );
    }

    typecastDatesInPlayerFields(fields.playerFields);
    const email = getEmailFromToken(req);
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or email not found" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const formCollection: Collection = db.collection("form");

    // Fetch form data based on formId
    const form = await formCollection.findOne({ _id: new ObjectId(formId) });
    if (!form) {
      return NextResponse.json(
        { success: false, message: "Form not found" },
        { status: 404 }
      );
    }

    const ownerId = form.ownerId;

    // Fetch user data based on the ownerId
    const userResponse = await fetchUserData("_id", ownerId, ["email","universityName","name"]);
    if (!userResponse.success || !userResponse.data?.email) {
      return NextResponse.json(
        { success: false, message: "Owner not found or invalid response" },
        { status: 404 }
      );
    }

    // Check if the email from the token matches the owner's email
    if (userResponse.data.email !== email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Emails do not match" },
        { status: 401 }
      );
    }

    // If status is "submitted", reject the update request
    if (form.status === "submitted") {
      return NextResponse.json(
        { success: false, message: "Cannot update a form that has been submitted" },
        { status: 400 }
      );
    }

    // Update form fields and status based on isDraft
    const updatedData: Partial<FormObj> = {
      fields,
      updatedAt: new Date(),
    };

    if (!isDraft) {
      updatedData.status = "submitted"; // Update status to "submitted" if isDraft is false
    }

    // Update the form in the database
    await formCollection.updateOne(
      { _id: new ObjectId(formId) },
      { $set: updatedData }
    );
    // In your POST function, where you're calling sendConfirmationEmail:
if (!isDraft) {
  try {
    const emailFormData = {
      email:email,
      _id: formId,
      ownerId: ownerId.toString(),
      name:userResponse.data.name, // Convert ObjectId to string
      title: form.title,
      universityName:userResponse.data.universityName,
      status: "submitted",
      fields: fields // This already has the correct structure
    };
    console.log(emailFormData);
    await sendConfirmationEmail(emailFormData); 
  } catch (error) {
    // console.error("Failed to send confirmation email:", error);
    // Continue with the response even if email fails
  }
}

    // Now, call updateUserData to update the user collection
  if(!isDraft){
    const playerCount = fields.playerFields ? fields.playerFields.length : 0;
    const userDataToUpdate = {
      submittedForms: {
        [form.title]: {
          Players: playerCount,
          status: 'not_confirmed',
        },
      },
    };

    const response = await updateUserData(userResponse.data.email, userDataToUpdate);
    const updateResponse = response as UpdateResponse;
    if (!updateResponse.success) {
      return NextResponse.json(
        { success: false, message: updateResponse.message },
        { status: 400 }
      );
    }
  }


    return NextResponse.json(
      { success: true, message: "Form updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in API handler:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
