import type { APIRoute } from 'astro';
import { flashcardsService } from '../../../services/flashcards';
import { InputSanitizer } from '../../../utils/security';
import { verifyToken } from '../../../utils/authHelpers';

// GET single flashcard
export const GET: APIRoute = async ({ request, params }) => {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.data?.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = authResult.data.userId;
    const cardId = params.cardId;

    if (!cardId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Card ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get flashcard using service
    const result = await flashcardsService.getFlashcardById(cardId, userId);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to retrieve flashcard'
        }),
        {
          status: result.error?.includes('not found') ? 404 : 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Convert to frontend format
    const card = result.data;
    const flashcard = card ? {
      id: parseInt(card.cardId),
      english: card.front,
      spanish: card.back,
      exampleEnglish: card.exampleFront,
      exampleSpanish: card.exampleBack,
      image: card.image,
      category: card.category,
      difficulty: card.difficulty,
      tags: card.tags,
      dueDate: card.sm2.nextReviewDate.toISOString(),
      interval: card.sm2.interval,
      easinessFactor: card.sm2.easeFactor,
      repetitions: card.sm2.repetitions,
      lastReviewed: card.sm2.lastReviewed?.toISOString() || null,
      reviewCount: card.sm2.totalReviews || 0,
      isSuspended: card.sm2.isSuspended || false,
      createdAt: card.createdAt?.toISOString(),
      updatedAt: card.updatedAt?.toISOString()
    } : null;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          flashcard
        },
        message: 'Flashcard retrieved successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Get flashcard API error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// PUT update flashcard
export const PUT: APIRoute = async ({ request, params }) => {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.data?.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = authResult.data.userId;
    const cardId = params.cardId;

    if (!cardId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Card ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body = await request.json();

    // Prepare update data (only include fields that are provided)
    const updates: Record<string, unknown> = {};

    if (body.english !== undefined) {
      updates.front = InputSanitizer.sanitizeString(body.english.trim(), 500);
    }

    if (body.spanish !== undefined) {
      updates.back = InputSanitizer.sanitizeString(body.spanish.trim(), 500);
    }

    if (body.exampleEnglish !== undefined) {
      updates.exampleFront = body.exampleEnglish ? InputSanitizer.sanitizeString(body.exampleEnglish.trim(), 1000) : '';
    }

    if (body.exampleSpanish !== undefined) {
      updates.exampleBack = body.exampleSpanish ? InputSanitizer.sanitizeString(body.exampleSpanish.trim(), 1000) : '';
    }

    if (body.image !== undefined) {
      updates.image = body.image ? InputSanitizer.sanitizeString(body.image.trim(), 500) : null;
    }

    if (body.category !== undefined) {
      updates.category = InputSanitizer.sanitizeString(body.category.trim(), 100);
    }

    if (body.difficulty !== undefined) {
      updates.difficulty = body.difficulty;
    }

    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags) 
        ? body.tags.map((tag: string) => InputSanitizer.sanitizeString(tag.trim(), 50)).filter(Boolean)
        : [];
    }

    // Update flashcard using service
    const result = await flashcardsService.updateFlashcard(cardId, updates, userId);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to update flashcard'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Convert to frontend format
    const updatedCard = result.data;
    const flashcard = updatedCard ? {
      id: parseInt(updatedCard.cardId),
      english: updatedCard.front,
      spanish: updatedCard.back,
      exampleEnglish: updatedCard.exampleFront,
      exampleSpanish: updatedCard.exampleBack,
      image: updatedCard.image,
      category: updatedCard.category,
      difficulty: updatedCard.difficulty,
      tags: updatedCard.tags,
      dueDate: updatedCard.sm2.nextReviewDate.toISOString(),
      interval: updatedCard.sm2.interval,
      easinessFactor: updatedCard.sm2.easeFactor,
      repetitions: updatedCard.sm2.repetitions,
      lastReviewed: updatedCard.sm2.lastReviewed?.toISOString() || null,
      reviewCount: updatedCard.sm2.totalReviews || 0,
      isSuspended: updatedCard.sm2.isSuspended || false,
      createdAt: updatedCard.createdAt?.toISOString(),
      updatedAt: updatedCard.updatedAt?.toISOString()
    } : null;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          flashcard
        },
        message: 'Flashcard updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Update flashcard API error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// DELETE flashcard
export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.data?.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = authResult.data.userId;
    const cardId = params.cardId;

    if (!cardId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Card ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete flashcard using service
    const result = await flashcardsService.deleteFlashcard(cardId, userId);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to delete flashcard'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          deletedCount: result.data?.deletedCount || 0
        },
        message: 'Flashcard deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Delete flashcard API error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};