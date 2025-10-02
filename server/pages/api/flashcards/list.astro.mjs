import { f as flashcardsService } from '../../../chunks/flashcards_BQGdHDD6.mjs';
import { v as verifyToken } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const GET = async ({ request, url }) => {
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
    const searchParams = url.searchParams;
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");
    const includeSuspended = searchParams.get("includeSuspended") === "true";
    const dueOnly = searchParams.get("dueOnly") === "true";
    let result;
    if (dueOnly) {
      result = await flashcardsService.getDueFlashcards(userId, {
        limit,
        category: category || void 0,
        includeSuspended
      });
    } else if (category) {
      result = await flashcardsService.getFlashcardsByCategory(
        userId,
        category,
        {
          limit
        }
      );
    } else {
      result = await flashcardsService.getAllFlashcards(userId, {
        limit: 1e3
        // Large limit to get all cards
      });
    }
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Failed to retrieve flashcards"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const flashcards = result.data?.map((card) => ({
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
        message: "Flashcards retrieved successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("List flashcards API error:", error);
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
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
