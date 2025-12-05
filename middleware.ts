import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { decrypt } from "@/app/utils/encryption";

// Force middleware to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET;

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("authToken")?.value;

  const isSignInPage = req.nextUrl.pathname === "/SignIn";

  // If there's no token
  if (!token) {
    if (isSignInPage) {
      // Allow access to the SignIn page if unauthenticated
      return NextResponse.next();
    }
    // Redirect unauthenticated users on protected routes to SignIn
    return NextResponse.redirect(new URL("/SignIn", req.url), { status: 302 });
  }

  // Validate the token
  const isValid = await validateToken(token);

  if (isValid) {
    if (isSignInPage) {
      // Redirect authenticated users away from SignIn to Dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url), { status: 302 });
    }
    // Allow access to protected routes if authenticated
    return NextResponse.next();
  }

  // Redirect to SignIn if the token is invalid or expired
  return NextResponse.redirect(new URL("/SignIn", req.url), { status: 302 });
}

// Token validation function - validates directly without HTTP request
async function validateToken(token: string): Promise<boolean> {
  try {
    if (!JWT_SECRET) {
      return false;
    }

    // Decrypt and verify the token directly
    const decryptedToken = decrypt(token).jwt;
    jwt.verify(decryptedToken, JWT_SECRET as jwt.Secret);
    
    return true;
  } catch (error) {
    // Token is invalid or expired
    return false;
  }
}

// Middleware matcher configuration
export const config = {
  matcher: [
    "/dashboard/:path*", // Protect all Dashboard routes
  ],
};
