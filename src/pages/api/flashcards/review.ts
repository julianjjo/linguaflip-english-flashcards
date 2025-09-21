import type { APIRoute } from 'astro';
import { flashcardsService } from '../../../services/flashcards';
import { verifyToken } from '../../../utils/authHelpers';

export const POST: APIRoute = async ({ request }) => {
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

    // Parse request body
    const body = await request.json();
    const cardId = body.cardId;

    // Debug logging
    console.log('Review endpoint - received body:', JSON.stringify(body, null, 2));
    console.log('Review endpoint - cardId:', cardId, 'type:', typeof cardId);

    if (!cardId) {
      console.log('Review endpoint - Missing cardId, returning 400');
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

    // Validate required fields
    if (typeof body.quality !== 'number' || body.quality < 0 || body.quality > 5) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Quality must be a number between 0 and 5'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const quality = Math.floor(body.quality);
    const responseTime = body.responseTime || 0; // Response time in milliseconds

    // Process review response using SM-2 algorithm
    const result = await flashcardsService.processReviewResponse(
      cardId,
      quality,
      responseTime,
      userId
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to process review response'
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
      id: updatedCard.cardId, // Keep as string to match frontend
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
      updatedAt: updatedCard.updatedAt?.toISOString(),
      // Add SM-2 specific data for frontend
      sm2: {
        quality: quality,
        interval: updatedCard.sm2.interval,
        easeFactor: updatedCard.sm2.easeFactor,
        repetitions: updatedCard.sm2.repetitions,
        nextReviewDate: updatedCard.sm2.nextReviewDate.toISOString(),
        lastReviewed: updatedCard.sm2.lastReviewed?.toISOString() || null
      }
    } : null;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          flashcard,
          reviewData: {
            quality,
            responseTime,
            newInterval: updatedCard?.sm2.interval,
            newEaseFactor: updatedCard?.sm2.easeFactor,
            nextReviewDate: updatedCard?.sm2.nextReviewDate.toISOString()
          }
        },
        message: 'Review response processed successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Review flashcard API error:', error);

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