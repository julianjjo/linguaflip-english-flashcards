/**
 * Common Validators for MongoDB Schema Definitions
 *
 * This module contains basic validation functions used across
 * different schema definitions in the LinguaFlip application.
 */

/**
 * Email validation function
 */
export const emailValidator = function (email: unknown): boolean {
  if (!email || typeof email !== 'string') return true; // Allow empty or non-string emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * URL validation function
 */
export const urlValidator = function (url: unknown): boolean {
  if (!url || typeof url !== 'string') return true; // Allow empty or non-string URLs
  const urlRegex = /^https?:\/\/.+/;
  return urlRegex.test(url);
};

/**
 * Quality response validation (0-5)
 */
export const qualityValidator = function (quality: number): boolean {
  return quality >= 0 && quality <= 5;
};

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}
