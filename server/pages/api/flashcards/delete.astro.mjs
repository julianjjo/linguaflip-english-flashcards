import { f as flashcardsService } from '../../../chunks/flashcards_BQGdHDD6.mjs';
import { v as verifyToken } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

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
  DELETE
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
