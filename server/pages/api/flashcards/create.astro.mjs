import { f as flashcardsService } from '../../../chunks/flashcards_BQGdHDD6.mjs';
import { v as verifyToken, I as InputSanitizer } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const POST = async ({ request }) => {
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
    const body = await request.json();
    if (!body.english || !body.spanish) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "English and Spanish text are required"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const cardId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = /* @__PURE__ */ new Date();
    const cardData = {
      cardId,
      userId,
      front: InputSanitizer.sanitizeString(body.english.trim(), 500),
      back: InputSanitizer.sanitizeString(body.spanish.trim(), 500),
      exampleFront: body.exampleEnglish ? InputSanitizer.sanitizeString(body.exampleEnglish.trim(), 1e3) : "",
      exampleBack: body.exampleSpanish ? InputSanitizer.sanitizeString(body.exampleSpanish.trim(), 1e3) : "",
      image: body.image ? InputSanitizer.sanitizeString(body.image.trim(), 500) : null,
      category: body.category ? InputSanitizer.sanitizeString(body.category.trim(), 100) : "general",
      difficulty: body.difficulty || "medium",
      tags: Array.isArray(body.tags) ? body.tags.map((tag) => InputSanitizer.sanitizeString(tag.trim(), 50)).filter(Boolean) : [],
      createdAt: now,
      updatedAt: now
    };
    const result = await flashcardsService.createFlashcard(cardData, userId);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Failed to create flashcard"
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
          cardId: result.data?.cardId,
          flashcard: result.data
        },
        message: "Flashcard created successfully"
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Create flashcard API error:", error);
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
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
