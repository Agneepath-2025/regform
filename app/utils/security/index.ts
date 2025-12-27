/**
 * Security utility exports
 * Central export point for all security features
 */

// Input Validation
export {
  sanitizeString,
  sanitizeHtml,
  sanitizeSearchQuery,
  isValidEmail,
  isValidPhone,
  isValidObjectId,
  isValidUrl,
  validateFile,
  validatePagination,
  isValidDateRange,
  commonSchemas,
  userRegistrationSchema,
  paymentSubmissionSchema,
} from './input-validation';

// Security Headers
export {
  securityHeaders,
  addSecurityHeaders,
  getCorsHeaders,
  addCorsHeaders,
} from './headers';

// CSRF Protection
export {
  csrfManager,
  verifyCsrfToken,
} from './csrf';

// Encryption
export {
  encryptData,
  decryptData,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashData,
} from './encryption';

// Error Handling
export {
  AppError,
  sanitizeErrorMessage,
  logError,
  formatErrorResponse,
} from './error-handler';

// API Wrapper
export {
  secureApiRoute,
  validateRequestBody,
  isAllowedOrigin,
} from './api-wrapper';
