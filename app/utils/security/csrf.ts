import { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * CSRF Token Management
 */
class CSRFTokenManager {
  private tokens = new Map<string, { token: string; timestamp: number }>();
  private readonly tokenLifetime = 3600000; // 1 hour

  /**
   * Generate a new CSRF token
   */
  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(sessionId, {
      token,
      timestamp: Date.now(),
    });
    
    // Clean up old tokens
    this.cleanupExpiredTokens();
    
    return token;
  }

  /**
   * Validate CSRF token
   */
  validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) {
      return false;
    }

    // Check if token is expired
    if (Date.now() - stored.timestamp > this.tokenLifetime) {
      this.tokens.delete(sessionId);
      return false;
    }

    return stored.token === token;
  }

  /**
   * Remove expired tokens
   */
  private cleanupExpiredTokens() {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now - data.timestamp > this.tokenLifetime) {
        this.tokens.delete(sessionId);
      }
    }
  }

  /**
   * Clear token for a session
   */
  clearToken(sessionId: string) {
    this.tokens.delete(sessionId);
  }
}

export const csrfManager = new CSRFTokenManager();

/**
 * Verify CSRF token from request
 */
export function verifyCsrfToken(req: NextRequest): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }

  const sessionId = req.cookies.get('sessionId')?.value;
  const csrfToken = req.headers.get('x-csrf-token');

  if (!sessionId || !csrfToken) {
    return false;
  }

  return csrfManager.validateToken(sessionId, csrfToken);
}
