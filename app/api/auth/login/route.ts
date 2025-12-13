import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { fetchUserData } from "@/app/utils/GetUpdateUser";
import { compareHash } from "@/app/utils/hashing";
import { encrypt } from "@/app/utils/encryption";
/* eslint-disable @typescript-eslint/no-unused-vars */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not configured. Please set JWT_SECRET in your .env file.");
}

export async function POST(req: NextRequest) {
  try {
    const { emaile, passworde } = await req.json();
    const email = emaile.toLowerCase();
    const password = passworde;

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Missing credentials" }, { status: 400 });
    }

    // Check if email is verified
    const emailverif = await fetchUserData('email', email, ['emailVerified']);
    if (emailverif.success && emailverif.data.emailVerified == false) {
      return NextResponse.json({
        success: false,
        message: "Email is not verified. Please verify your email before logging in."
      }, { status: 403 });
    }

    // Fetch user data
    const result = await fetchUserData("email", email, ["email", "password", "name"]);
    if (!result.success) {
      return NextResponse.json({ success: false, message: "Password or Email is incorrect" }, { status: 404 });
    }

    const user = result.data;

    // Check if the user is logging in with a Google account (no password set)
    if (!user.password) {
      return NextResponse.json({
        success: false,
        message: "This account is a Google account. Please use Google authentication to log in.",
      }, { status: 401 });
    }

    // Compare hashed password
    const isValidPassword = await compareHash(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ success: false, message: "Password or Email is incorrect" }, { status: 401 });
    }

    // Generate JWT
    const payload = { email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2d" });

    // Encrypt token (optional)
    const encryptedToken = encrypt({ jwt: token });

    return NextResponse.json({ success: true, token: encryptedToken });
  } catch (error) {
    // console.error("Login error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
