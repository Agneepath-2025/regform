import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../rateLimit";
import { addSecurityHeaders } from "./headers";
import { sanitizeErrorMessage, logError } from "./error-handler";
import { auth } from "@/auth";

/**
 * API Route Wrapper with security features
 */
export function secureApiRoute<T = unknown>(
  handler: (req: NextRequest, context?: T) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    rateLimit?: {
      windowMs: number;
      maxRequests: number;
    };
  } = {}
) {
  return async (req: NextRequest, context?: T) => {
    try {
      // Apply rate limiting if configured
      if (options.rateLimit) {
        const rateLimitResponse = rateLimit(req, options.rateLimit);
        if (rateLimitResponse) {
          return addSecurityHeaders(rateLimitResponse);
        }
      }

      // Check authentication if required
      if (options.requireAuth || options.requireAdmin) {
        const session = await auth();
        
        if (!session?.user) {
          return addSecurityHeaders(
            NextResponse.json(
              { success: false, error: "Unauthorized" },
              { status: 401 }
            )
          );
        }

        // Check admin role if required
        if (options.requireAdmin) {
          const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
          if (!adminEmails.includes(session.user.email || '')) {
            return addSecurityHeaders(
              NextResponse.json(
                { success: false, error: "Forbidden - Admin access required" },
                { status: 403 }
              )
            );
          }
        }
      }

      // Call the actual handler
      const response = await handler(req, context);
      
      // Add security headers to response
      return addSecurityHeaders(response);
    } catch (error) {
      logError(error, {
        path: req.nextUrl.pathname,
        method: req.method,
      });

      return addSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: sanitizeErrorMessage(error),
          },
          { status: 500 }
        )
      );
    }
  };
}

/**
 * Validate request body
 */
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Invalid request body",
    };
  }
}

/**
 * Check if request is from allowed origin
 */
export function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.ROOT_URL,
    'http://localhost:3000',
  ].filter(Boolean);

  return !origin || allowedOrigins.includes(origin);
}
