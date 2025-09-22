/**
 * Document Validation Utilities
 * 
 * This module contains utilities for validating documents against MongoDB schemas.
 */

import { emailValidator, urlValidator } from './common.ts';
import { sm2Validator } from './sm2.ts';
import type { FlashcardSM2Data } from '../../types/database';

/**
 * MongoDB Schema Validator interface
 */
export interface SchemaValidator {
  validator?: {
    $jsonSchema?: {
      required?: string[];
      [key: string]: unknown;
    };
  };
}

/**
 * Document interface for validation
 */
export interface ValidationDocument {
  [key: string]: unknown;
  sm2?: Record<string, unknown> | FlashcardSM2Data;
  email?: unknown;
  audioUrl?: unknown;
  imageUrl?: unknown;
}

/**
 * Validate collection data against schema
 */
export function validateDocument(
  document: ValidationDocument, 
  schema: SchemaValidator
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation logic (can be enhanced with a proper JSON schema validator)
  try {
    // Check required fields
    const required = schema.validator?.$jsonSchema?.required;
    if (required && Array.isArray(required)) {
      for (const field of required) {
        if (!(field in document) || document[field] === null || document[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check SM-2 parameters if present
    if (document.sm2 && !sm2Validator(document.sm2)) {
      errors.push('Invalid SM-2 parameters');
    }

    // Check email format if present
    if (document.email && !emailValidator(document.email)) {
      errors.push('Invalid email format');
    }

    // Check URL formats if present
    if (document.audioUrl && !urlValidator(document.audioUrl)) {
      errors.push('Invalid audio URL format');
    }
    if (document.imageUrl && !urlValidator(document.imageUrl)) {
      errors.push('Invalid image URL format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}