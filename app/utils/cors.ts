import { NextRequest, NextResponse } from "next/server";

/**
 * CORS Configuration
 */
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://register.agneepath.co.in",
  "https://agneepath.co.in",
  "https://www.agneepath.co.in",
];

// Allow development origins in non-production environments
const isDevelopment = process.env.NODE_ENV === "development";
if (isDevelopment) {
  ALLOWED_ORIGINS.push("http://127.0.0.1:3000", "http://127.0.0.1:3001");
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    // Allow requests with no origin (same-origin, mobile apps, Postman, etc.)
    return true;
  }
  
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for a given origin
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

/**
 * Handle CORS for API routes
 * @param req - NextRequest object
 * @returns NextResponse with CORS headers or null if request should proceed
 */
export function handleCors(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  
  // Check if origin is allowed for non-OPTIONS requests
  if (origin && !isOriginAllowed(origin)) {
    return NextResponse.json(
      {
        success: false,
        message: "CORS policy: Origin not allowed",
      },
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  
  // Origin is allowed, request should proceed with CORS headers
  return null;
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  const corsHeaders = getCorsHeaders(origin);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Wrapper to apply CORS to API route handlers
 */
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const origin = req.headers.get("origin");
    
    // Handle CORS preflight and origin validation
    const corsResult = handleCors(req);
    if (corsResult) {
      return corsResult;
    }
    
    // Execute the actual handler
    const response = await handler(req);
    
    // Add CORS headers to response
    return addCorsHeaders(response, origin);
  };
}
