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
    const days = parseInt(url.searchParams.get("days") || "30");
    const type = url.searchParams.get("type") || "daily";
    const studyHistory = studyHistoryStore.get();
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const filteredSessions = studyHistory.filter(
      (session) => new Date(session.date) >= cutoffDate
    );
    let progressData = [];
    if (type === "daily") {
      const dailyData = /* @__PURE__ */ new Map();
      for (let i = 0; i < days; i++) {
        const date = /* @__PURE__ */ new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split("T")[0];
        dailyData.set(dateString, {
          date: dateString,
          cardsReviewed: 0,
          correctAnswers: 0,
          totalTime: 0,
          sessions: 0,
          accuracy: 0
        });
      }
      filteredSessions.forEach((session) => {
        const date = session.date.split("T")[0];
        if (dailyData.has(date)) {
          const existing = dailyData.get(date);
          existing.cardsReviewed += session.cardsReviewed;
          existing.correctAnswers += session.correctAnswers;
          existing.totalTime += session.totalTime;
          existing.sessions += 1;
          existing.accuracy = existing.cardsReviewed > 0 ? Math.round(
            existing.correctAnswers / existing.cardsReviewed * 100
          ) : 0;
        }
      });
      progressData = Array.from(dailyData.values()).reverse();
    } else if (type === "weekly") {
      const weeklyData = /* @__PURE__ */ new Map();
      filteredSessions.forEach((session) => {
        const date = new Date(session.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];
        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, {
            weekStart: weekKey,
            cardsReviewed: 0,
            correctAnswers: 0,
            totalTime: 0,
            sessions: 0,
            accuracy: 0
          });
        }
        const existing = weeklyData.get(weekKey);
        existing.cardsReviewed += session.cardsReviewed;
        existing.correctAnswers += session.correctAnswers;
        existing.totalTime += session.totalTime;
        existing.sessions += 1;
        existing.accuracy = existing.cardsReviewed > 0 ? Math.round(
          existing.correctAnswers / existing.cardsReviewed * 100
        ) : 0;
      });
      progressData = Array.from(weeklyData.values()).sort(
        (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );
    } else if (type === "monthly") {
      const monthlyData = /* @__PURE__ */ new Map();
      filteredSessions.forEach((session) => {
        const date = new Date(session.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthKey,
            cardsReviewed: 0,
            correctAnswers: 0,
            totalTime: 0,
            sessions: 0,
            accuracy: 0
          });
        }
        const existing = monthlyData.get(monthKey);
        existing.cardsReviewed += session.cardsReviewed;
        existing.correctAnswers += session.correctAnswers;
        existing.totalTime += session.totalTime;
        existing.sessions += 1;
        existing.accuracy = existing.cardsReviewed > 0 ? Math.round(
          existing.correctAnswers / existing.cardsReviewed * 100
        ) : 0;
      });
      progressData = Array.from(monthlyData.values()).sort(
        (a, b) => a.month.localeCompare(b.month)
      );
    }
    const summary = {
      totalCardsReviewed: filteredSessions.reduce(
        (sum, session) => sum + session.cardsReviewed,
        0
      ),
      totalCorrectAnswers: filteredSessions.reduce(
        (sum, session) => sum + session.correctAnswers,
        0
      ),
      totalStudyTime: filteredSessions.reduce(
        (sum, session) => sum + session.totalTime,
        0
      ),
      totalSessions: filteredSessions.length,
      averageAccuracy: filteredSessions.length > 0 ? Math.round(
        filteredSessions.reduce(
          (sum, session) => sum + session.correctAnswers,
          0
        ) / filteredSessions.reduce(
          (sum, session) => sum + session.cardsReviewed,
          0
        ) * 100
      ) : 0,
      averageCardsPerSession: filteredSessions.length > 0 ? Math.round(
        filteredSessions.reduce(
          (sum, session) => sum + session.cardsReviewed,
          0
        ) / filteredSessions.length
      ) : 0,
      averageTimePerSession: filteredSessions.length > 0 ? Math.round(
        filteredSessions.reduce(
          (sum, session) => sum + session.totalTime,
          0
        ) / filteredSessions.length
      ) : 0
    };
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          progressData,
          summary,
          period: { days, type }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Dashboard progress API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch progress data"
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
