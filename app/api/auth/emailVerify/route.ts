import { decrypt } from "@/app/utils/encryption";
import { removeUserField, fetchUserData, updateUserData } from "@/app/utils/GetUpdateUser";
import { createErrorResponse } from "@/app/utils/interfaces";
import { encrypt } from "@/app/utils/encryption";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "your-256-bit-secret";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vid, e } = body;
    
    // Decrypt the verification ID and email
    const decryptedVid = decrypt(vid);
    const decryptedEmail = decrypt(e);
    
    if (!decryptedVid || !decryptedVid.vid || !decryptedEmail || !decryptedEmail.email) {
      return createErrorResponse(400, "Invalid verification link.", "Unable to decrypt token.");
    }
    
    const id = decryptedVid.vid;
    const email = decryptedEmail.email;
    
    // Fetch user data
    const dbEmail = await fetchUserData('VerificationId', id, ['email', 'emailVerified']);

    // Check if response indicates success
    if ('success' in dbEmail && dbEmail.success && dbEmail.data.email == email) {
      // Check if already verified
      if (dbEmail.data.emailVerified === true) {
        // User is already verified, generate token anyway
        const payload = { email: email };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2d" });
        const encryptedToken = encrypt({ jwt: token });
        
        return new Response(
          JSON.stringify({ success: true, token: encryptedToken, alreadyVerified: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Update user as verified
      await updateUserData(email, { 'emailVerified': true });
      await removeUserField(email, 'VerificationId');
      
      const payload = { email: email };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2d" });
      const encryptedToken = encrypt({ jwt: token });

      // Return a success response
      return new Response(
        JSON.stringify({ success: true, token: encryptedToken }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Handle failure cases
      return createErrorResponse(400, "Verification failed.", "Invalid verification link or link expired.");
    }
  } catch (error: unknown) {
    // console.error(error);

    // Return a generic error response
    return createErrorResponse(500, "Internal server error.", String(error));
  }
}
