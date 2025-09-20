import type { APIRoute } from 'astro';
import { flashcardsService } from '../../../services/flashcards';
import { verifyToken } from '../../../utils/authHelpers';

export const GET: APIRoute = async ({ request, url }) => {
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

    // Parse query parameters
    const searchParams = url.searchParams;
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeSuspended = searchParams.get('includeSuspended') === 'true';
    const dueOnly = searchParams.get('dueOnly') === 'true';

    // Get flashcards based on filters
    let result;
    
    if (dueOnly) {
      // Get due flashcards for study
      result = await flashcardsService.getDueFlashcards(userId, {
        limit,
        category: category || undefined,
        includeSuspended
      });
    } else if (category) {
      // Get flashcards by category
      result = await flashcardsService.getFlashcardsByCategory(userId, category, {
        limit
      });
    } else {
      // Get all user flashcards (we'll use getDueFlashcards with a future date)
      result = await flashcardsService.getDueFlashcards(userId, {
        limit: 1000, // Large limit to get all cards
        includeSuspended: true
      });
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to retrieve flashcards'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Convert MongoDB format to frontend format
    const flashcards = result.data?.map(card => ({
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
    })) || [];

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          flashcards,
          total: flashcards.length,
          filters: {
            category,
            dueOnly,
            includeSuspended,
            limit
          }
        },
        message: 'Flashcards retrieved successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('List flashcards API error:', error);

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