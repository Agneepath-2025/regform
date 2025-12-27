/**
 * Centralized error handling and logging
 */

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return 'An unexpected error occurred. Please try again later.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error occurred';
}

/**
 * Safe error logger (doesn't log sensitive information)
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const sanitizedContext = sanitizeLogContext(context);

  console.error('[ERROR]', {
    timestamp,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: sanitizedContext,
  });
}

/**
 * Remove sensitive data from log context
 */
function sanitizeLogContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'sessionId',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Error response formatter
 */
export function formatErrorResponse(error: unknown) {
  const sanitizedMessage = sanitizeErrorMessage(error);
  const errorCode = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const httpStatus = error instanceof AppError ? error.statusCode : 500;

  return {
    success: false,
    error: {
      message: sanitizedMessage,
      code: errorCode,
      statusCode: httpStatus,
      ...(process.env.NODE_ENV === 'development' && error instanceof Error
        ? { stack: error.stack }
        : {}),
    },
  };
}
