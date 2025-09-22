/**
 * SM-2 Algorithm Validators and Utilities
 * 
 * This module contains validation functions and utilities specific
 * to the SM-2 spaced repetition algorithm used in LinguaFlip.
 */

/**
 * SM-2 algorithm parameters interface
 */
export interface SM2Params {
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
}

/**
 * SM-2 algorithm parameters validation
 */
import type { FlashcardSM2Data } from '../../types/database';

export const sm2Validator = function(sm2: Record<string, unknown> | FlashcardSM2Data): boolean {
  if (!sm2) return true;

  const { easeFactor, interval, repetitions } = sm2 as SM2Params;

  // Validate ease factor (1.3 to 2.5)
  if (easeFactor !== undefined && (easeFactor < 1.3 || easeFactor > 2.5)) {
    return false;
  }

  // Validate interval (minimum 1)
  if (interval !== undefined && interval < 1) {
    return false;
  }

  // Validate repetitions (non-negative)
  if (repetitions !== undefined && repetitions < 0) {
    return false;
  }

  return true;
};

/**
 * Validate SM-2 algorithm parameters
 */
export function validateSM2Params(params: {
  quality: number;
  easeFactor: number;
  interval: number;
}): boolean {
  const { quality, easeFactor, interval } = params;

  return quality >= 0 && quality <= 5 &&
         easeFactor >= 1.3 && easeFactor <= 2.5 &&
         interval >= 1;
}

/**
 * Generate default SM-2 parameters for new cards
 */
export function getDefaultSM2Params(): {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
} {
  return {
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: new Date()
  };
}

/**
 * Calculate next review date based on SM-2 algorithm
 */
export function calculateNextReviewDate(
  currentInterval: number,
  easeFactor: number,
  quality: number
): Date {
  let newInterval: number;

  if (quality >= 3) {
    // Correct response
    if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * easeFactor);
    }
  } else {
    // Incorrect response
    newInterval = 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return nextReview;
}