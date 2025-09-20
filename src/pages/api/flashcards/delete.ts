import type { APIRoute } from 'astro';
import { flashcardsService } from '../../../services/flashcards';
import { verifyToken } from '../../../utils/authHelpers';

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