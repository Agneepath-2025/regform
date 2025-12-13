import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
  message?: string; // Custom error message
}

interface RequestLog {
  timestamps: number[];
}

// In-memory store for rate limiting (use Redis in production for scalability)
const rateLimitStore = new Map<string, RequestLog>();

/**
 * Get client IP address from request
 */
function getClientIp(req: NextRequest): string {
  // Check various headers for IP address (reverse proxy scenarios)
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip"); // Cloudflare
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a generic identifier if no IP found
  return "unknown";
}

/**
 * Rate limiting middleware
 * @param req - NextRequest object
 * @param config - Rate limit configuration
 * @returns NextResponse if rate limit exceeded, null otherwise
 */
export function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const { windowMs, maxRequests, message } = config;
  const clientIp = getClientIp(req);
  const now = Date.now();
  
  // Get or create request log for this IP
  let requestLog = rateLimitStore.get(clientIp);
  
  if (!requestLog) {
    requestLog = { timestamps: [] };
    rateLimitStore.set(clientIp, requestLog);
  }
  
  // Remove timestamps outside the current window
  requestLog.timestamps = requestLog.timestamps.filter(
    (timestamp) => now - timestamp < windowMs
  );
  
  // Check if limit exceeded
  if (requestLog.timestamps.length >= maxRequests) {
    const oldestTimestamp = requestLog.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000); // seconds
    
    return NextResponse.json(
      {
        success: false,
        message: message || "Too many requests. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(resetTime).toISOString(),
        },
      }
    );
  }
  
  // Add current request timestamp
  requestLog.timestamps.push(now);
  
  // Add rate limit headers to response (will be set by caller)
  return null;
}

/**
 * Cleanup old entries from rate limit store (call periodically)
 */
export function cleanupRateLimitStore(maxAge: number = 3600000) {
  const now = Date.now();
  
  for (const [ip, log] of rateLimitStore.entries()) {
    // Remove timestamps older than maxAge
    log.timestamps = log.timestamps.filter((timestamp) => now - timestamp < maxAge);
    
    // Remove entry if no recent requests
    if (log.timestamps.length === 0) {
      rateLimitStore.delete(ip);
    }
  }
}

// Cleanup every 10 minutes
setInterval(() => cleanupRateLimitStore(), 600000);

/**
 * Preset rate limit configurations
 */
export const rateLimitPresets = {
  // Strict rate limit for authentication endpoints (5 requests per minute)
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: "Too many login attempts. Please try again after 1 minute.",
  },
  
  // Moderate rate limit for form submissions (20 requests per minute)
  formSubmit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: "Too many form submissions. Please slow down.",
  },
  
  // Standard rate limit for general API routes (100 requests per minute)
  standard: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: "Rate limit exceeded. Please try again later.",
  },
  
  // Relaxed rate limit for read operations (200 requests per minute)
  readOnly: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    message: "Too many requests. Please slow down.",
  },
};
