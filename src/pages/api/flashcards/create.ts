import type { APIRoute } from 'astro';
import { flashcardsService } from '../../../services/flashcards';
import { InputSanitizer } from '../../../utils/security';
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
    
    // Validate required fields
    if (!body.english || !body.spanish) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'English and Spanish text are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate unique card ID
    const cardId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Sanitize inputs
    const now = new Date();
    const cardData = {
      cardId,
      userId,
      front: InputSanitizer.sanitizeString(body.english.trim(), 500),
      back: InputSanitizer.sanitizeString(body.spanish.trim(), 500),
      exampleFront: body.exampleEnglish ? InputSanitizer.sanitizeString(body.exampleEnglish.trim(), 1000) : '',
      exampleBack: body.exampleSpanish ? InputSanitizer.sanitizeString(body.exampleSpanish.trim(), 1000) : '',
      image: body.image ? InputSanitizer.sanitizeString(body.image.trim(), 500) : null,
      category: body.category ? InputSanitizer.sanitizeString(body.category.trim(), 100) : 'general',
      difficulty: body.difficulty || 'medium',
      tags: Array.isArray(body.tags) ? body.tags.map((tag: string) => InputSanitizer.sanitizeString(tag.trim(), 50)).filter(Boolean) : [],
      createdAt: now,
      updatedAt: now
    };

    // Create flashcard using service
    const result = await flashcardsService.createFlashcard(cardData, userId);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to create flashcard'
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
          cardId: result.data?.cardId,
          flashcard: result.data
        },
        message: 'Flashcard created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Create flashcard API error:', error);

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