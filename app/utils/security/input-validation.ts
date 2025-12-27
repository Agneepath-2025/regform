import { z } from "zod";

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (!input) return "";
  
  // Remove potential HTML/script tags
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Sanitize HTML content (for rich text)
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  
  // Allow only safe HTML tags and attributes
  // const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'];
  // const allowedAttributes = ['href', 'title'];
  
  // Basic sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailSchema = z.string().email();
  return emailSchema.safeParse(email).success;
}

/**
 * Validate phone number (Indian format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ""));
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate file upload
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFile(
  file: { size: number; type: string; name: string },
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    };
  }

  // Check extension
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`
    };
  }

  return { valid: true };
}

/**
 * Prevent SQL/NoSQL injection in search queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return "";
  
  // Remove special characters that could be used in injection
  return query
    .replace(/[${}]/g, '') // Remove MongoDB operators
    .replace(/['"`;]/g, '') // Remove quotes and semicolons
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: {
  page?: string | number;
  limit?: string | number;
}): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(params.page || 1)));
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || 10))));
  
  return { page, limit };
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate && startDate <= new Date();
}

/**
 * Schema for common validations
 */
export const commonSchemas = {
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  objectId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID"),
  url: z.string().url(),
  name: z.string().min(2).max(100),
  university: z.string().min(2).max(200),
  transactionId: z.string().min(5).max(50),
  amount: z.number().min(0).max(1000000),
};

/**
 * Validate user registration data
 */
export const userRegistrationSchema = z.object({
  name: commonSchemas.name,
  email: commonSchemas.email,
  phone: commonSchemas.phone,
  universityName: commonSchemas.university,
  password: z.string().min(8).max(100),
});

/**
 * Validate payment submission data
 */
export const paymentSubmissionSchema = z.object({
  transactionId: commonSchemas.transactionId,
  amount: commonSchemas.amount,
  payeeName: z.string().min(2).max(100),
  paymentMode: z.enum(['UPI', 'Bank Transfer', 'Cash']),
  paymentDate: z.date(),
});
