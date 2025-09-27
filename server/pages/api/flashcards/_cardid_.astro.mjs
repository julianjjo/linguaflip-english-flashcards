import { f as flashcardsService } from '../../../chunks/flashcards_BQGdHDD6.mjs';
import { v as verifyToken, I as InputSanitizer } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const GET = async ({ request, params }) => {
  try {
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.data?.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication required"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const userId = authResult.data.userId;
    const cardId = params.cardId;
    if (!cardId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Card ID is required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const result = await flashcardsService.getFlashcardById(cardId, userId);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Failed to retrieve flashcard"
        }),
        {
          status: result.error?.includes("not found") ? 404 : 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
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
        message: "Flashcard retrieved successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Get flashcard API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
const PUT = async ({ request, params }) => {
  try {
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.data?.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication required"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const userId = authResult.data.userId;
    const cardId = params.cardId;
    if (!cardId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Card ID is required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const body = await request.json();
    const updates = {};
    if (body.english !== void 0) {
      updates.front = InputSanitizer.sanitizeString(body.english.trim(), 500);
    }
    if (body.spanish !== void 0) {
      updates.back = InputSanitizer.sanitizeString(body.spanish.trim(), 500);
    }
    if (body.exampleEnglish !== void 0) {
      updates.exampleFront = body.exampleEnglish ? InputSanitizer.sanitizeString(body.exampleEnglish.trim(), 1e3) : "";
    }
    if (body.exampleSpanish !== void 0) {
      updates.exampleBack = body.exampleSpanish ? InputSanitizer.sanitizeString(body.exampleSpanish.trim(), 1e3) : "";
    }
    if (body.image !== void 0) {
      updates.image = body.image ? InputSanitizer.sanitizeString(body.image.trim(), 500) : null;
    }
    if (body.category !== void 0) {
      updates.category = InputSanitizer.sanitizeString(
        body.category.trim(),
        100
      );
    }
    if (body.difficulty !== void 0) {
      updates.difficulty = body.difficulty;
    }
    if (body.tags !== void 0) {
      updates.tags = Array.isArray(body.tags) ? body.tags.map((tag) => InputSanitizer.sanitizeString(tag.trim(), 50)).filter(Boolean) : [];
    }
    const result = await flashcardsService.updateFlashcard(
      cardId,
      updates,
      userId
    );
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Failed to update flashcard"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
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
        message: "Flashcard updated successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Update flashcard API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
const DELETE = async ({ request, params }) => {
  try {
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.data?.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication required"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const userId = authResult.data.userId;
    const cardId = params.cardId;
    if (!cardId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Card ID is required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const result = await flashcardsService.deleteFlashcard(cardId, userId);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Failed to delete flashcard"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          deletedCount: result.data?.deletedCount || 0
        },
        message: "Flashcard deleted successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Delete flashcard API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  PUT
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
