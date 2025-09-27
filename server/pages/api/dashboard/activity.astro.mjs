import { a as authStateAtom, s as studyHistoryStore } from '../../../chunks/ui-components_Dymo2gSD.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const GET = async ({ url }) => {
  try {
    const authState = authStateAtom.get();
    if (!authState.isAuthenticated || !authState.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const studyHistory = studyHistoryStore.get();
    const sortedSessions = studyHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(offset, offset + limit);
    const enhancedSessions = sortedSessions.map((session) => {
      const accuracy = session.cardsReviewed > 0 ? Math.round(session.correctAnswers / session.cardsReviewed * 100) : 0;
      const averageTimePerCard = session.cardsReviewed > 0 ? Math.round(session.totalTime / session.cardsReviewed * 60) : 0;
      const sessionDate = new Date(session.date);
      const now = /* @__PURE__ */ new Date();
      const diffTime = Math.abs(now.getTime() - sessionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
      let relativeTime = "";
      if (diffDays === 1) {
        relativeTime = "Hoy";
      } else if (diffDays === 2) {
        relativeTime = "Ayer";
      } else if (diffDays <= 7) {
        relativeTime = `Hace ${diffDays - 1} días`;
      } else if (diffDays <= 30) {
        const weeks = Math.floor((diffDays - 1) / 7);
        relativeTime = weeks === 1 ? "Hace 1 semana" : `Hace ${weeks} semanas`;
      } else {
        const months = Math.floor((diffDays - 1) / 30);
        relativeTime = months === 1 ? "Hace 1 mes" : `Hace ${months} meses`;
      }
      let performanceLevel = "poor";
      if (accuracy >= 80) {
        performanceLevel = "excellent";
      } else if (accuracy >= 70) {
        performanceLevel = "good";
      } else if (accuracy >= 60) {
        performanceLevel = "fair";
      }
      return {
        ...session,
        accuracy,
        averageTimePerCard,
        relativeTime,
        performanceLevel,
        formattedDate: sessionDate.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: sessionDate.getFullYear() !== now.getFullYear() ? "numeric" : void 0
        })
      };
    });
    const totalSessions = studyHistory.length;
    const hasMore = offset + limit < totalSessions;
    const totalPages = Math.ceil(totalSessions / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    const currentPageSummary = {
      totalCardsReviewed: enhancedSessions.reduce(
        (sum, session) => sum + session.cardsReviewed,
        0
      ),
      totalStudyTime: enhancedSessions.reduce(
        (sum, session) => sum + session.totalTime,
        0
      ),
      averageAccuracy: enhancedSessions.length > 0 ? Math.round(
        enhancedSessions.reduce(
          (sum, session) => sum + session.accuracy,
          0
        ) / enhancedSessions.length
      ) : 0,
      sessionsCount: enhancedSessions.length
    };
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessions: enhancedSessions,
          pagination: {
            currentPage,
            totalPages,
            limit,
            offset,
            hasMore,
            total: totalSessions
          },
          summary: currentPageSummary
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Dashboard activity API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch activity data"
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
