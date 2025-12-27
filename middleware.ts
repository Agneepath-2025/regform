import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { decrypt } from "@/app/utils/encryption";
import { auth } from "@/auth";
import { addSecurityHeaders } from "@/app/utils/security/headers";
import { rateLimit } from "@/app/utils/rateLimit";

// Force middleware to use Node.js runtime instead of Edge
export const runtime = 'nodejs';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "";
}

export async function middleware(req: NextRequest) {
  // Apply rate limiting to API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const rateLimitResult = rateLimit(req, {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      message: "Too many requests from this IP, please try again later."
    });
    
    if (rateLimitResult) {
      return addSecurityHeaders(rateLimitResult);
    }
  }

  // Handle admin routes separately
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isAdminLoginPage = req.nextUrl.pathname === "/admin/login";
  
  if (isAdminRoute) {
    const session = await auth();
    
    if (!isAdminLoginPage && !session?.user) {
      // Redirect to login if not authenticated
      const response = NextResponse.redirect(new URL("/admin/login", req.url));
      return addSecurityHeaders(response);
    }

    if (isAdminLoginPage && session?.user) {
      // Redirect to admin dashboard if already authenticated
      const response = NextResponse.redirect(new URL("/admin", req.url));
      return addSecurityHeaders(response);
    }

    return addSecurityHeaders(NextResponse.next());
  }

  // Regular authentication flow for non-admin routes
  const token = req.cookies.get("authToken")?.value;

  const isSignInPage = req.nextUrl.pathname === "/SignIn";

  // If there's no token
  if (!token) {
    if (isSignInPage) {
      // Allow access to the SignIn page if unauthenticated
      return addSecurityHeaders(NextResponse.next());
    }
    // Redirect unauthenticated users on protected routes to SignIn
    const response = NextResponse.redirect(new URL("/SignIn", req.url), { status: 302 });
    return addSecurityHeaders(response);
  }

  // Validate the token
  const validationResult = await validateToken(token);

  if (validationResult.valid) {
    if (isSignInPage) {
      // Redirect authenticated users away from SignIn to Dashboard
      const response = NextResponse.redirect(new URL("/dashboard", req.url), { status: 302 });
      return addSecurityHeaders(response);
    }
    // Allow access to protected routes if authenticated
    return addSecurityHeaders(NextResponse.next());
  }

  // Redirect to SignIn with appropriate error message
  const redirectUrl = new URL("/SignIn", req.url);
  
  if (validationResult.expired) {
    redirectUrl.searchParams.set("error", "session_expired");
    redirectUrl.searchParams.set("message", "Your session has expired. Please sign in again.");
  } else {
    redirectUrl.searchParams.set("error", "invalid_token");
    redirectUrl.searchParams.set("message", "Invalid authentication. Please sign in again.");
  }
  
  // Clear the invalid/expired token
  const response = NextResponse.redirect(redirectUrl, { status: 302 });
  response.cookies.delete("authToken");
  
  return addSecurityHeaders(response);
}

// Token validation function - validates directly without HTTP request
async function validateToken(token: string): Promise<{ valid: boolean; expired: boolean }> {
  try {
    const JWT_SECRET = getJwtSecret();
    if (!JWT_SECRET) {
      return { valid: false, expired: false };
    }

    // Decrypt and verify the token directly
    const decryptedToken = decrypt(token).jwt;
    jwt.verify(decryptedToken, JWT_SECRET as jwt.Secret);
    
    return { valid: true, expired: false };
  } catch (error) {
    // Check if the error is specifically due to token expiration
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, expired: true };
    }
    
    // Token is invalid for other reasons (malformed, wrong signature, etc.)
    return { valid: false, expired: false };
  }
}

// Middleware matcher configuration
export const config = {
  matcher: [
    "/dashboard/:path*", // Protect all Dashboard routes
    "/admin/:path*",     // Protect all Admin routes
  ],
};
