import { f as flashcardsStore } from '../../../chunks/flashcard-components_CMlRFbcC.mjs';
import { a as authStateAtom, s as studyHistoryStore, p as progressStatsStore } from '../../../chunks/ui-components_Dymo2gSD.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const GET = async () => {
  try {
    const authState = authStateAtom.get();
    if (!authState.isAuthenticated || !authState.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const flashcards = flashcardsStore.get();
    const studyHistory = studyHistoryStore.get();
    const progressStats = progressStatsStore.get();
    const today = (/* @__PURE__ */ new Date()).toDateString();
    const todaySessions = studyHistory.filter(
      (session) => new Date(session.date).toDateString() === today
    );
    const todayStudyTime = todaySessions.reduce(
      (sum, session) => sum + session.totalTime,
      0
    );
    const masteredCards = flashcards.filter(
      (card) => card.easinessFactor >= 2.5 && card.repetitions >= 3
    ).length;
    const dueToday = flashcards.filter((card) => {
      const dueDate = new Date(card.dueDate);
      const today2 = /* @__PURE__ */ new Date();
      today2.setHours(0, 0, 0, 0);
      return dueDate <= today2;
    }).length;
    const stats = {
      totalCards: flashcards.length,
      masteredCards,
      currentStreak: progressStats.currentStreak,
      longestStreak: progressStats.longestStreak,
      todayStudyTime,
      cardsReviewedToday: todaySessions.reduce(
        (sum, session) => sum + session.cardsReviewed,
        0
      ),
      accuracyToday: todaySessions.length > 0 ? Math.round(
        todaySessions.reduce(
          (sum, session) => sum + session.correctAnswers,
          0
        ) / todaySessions.reduce(
          (sum, session) => sum + session.cardsReviewed,
          0
        ) * 100
      ) : 0,
      dueToday,
      totalStudyTime: progressStats.totalStudyTime,
      averageAccuracy: progressStats.averageAccuracy,
      sessionsThisWeek: progressStats.studySessionsThisWeek,
      sessionsThisMonth: progressStats.studySessionsThisMonth,
      cardsInProgress: flashcards.filter(
        (card) => card.repetitions > 0 && card.repetitions < 3
      ).length,
      newCards: flashcards.filter((card) => card.repetitions === 0).length
    };
    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch dashboard statistics"
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
