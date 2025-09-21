import type { APIRoute } from 'astro';
import { flashcardsService } from '../../../services/flashcards';
import { verifyToken } from '../../../utils/authHelpers';

export const GET: APIRoute = async ({ request }) => {
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

    // Get flashcard statistics
    const result = await flashcardsService.getFlashcardStats(userId);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to retrieve flashcard statistics'
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
        data: result.data,
        message: 'Flashcard statistics retrieved successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Flashcard stats API error:', error);

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