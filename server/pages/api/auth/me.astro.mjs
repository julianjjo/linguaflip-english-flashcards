import { v as verifyAccessToken, g as getUserById } from '../../../chunks/index_DlrD0jmL.mjs';
import { a as SecurityAuditor } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const GET = async ({ request }) => {
  try {
    let accessToken = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }
    if (!accessToken) {
      const cookieHeader = request.headers.get("Cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {});
        accessToken = cookies.accessToken || null;
      }
    }
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No authentication token provided"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const tokenResult = await verifyAccessToken(accessToken);
    if (!tokenResult.success || !tokenResult.data?.userId) {
      SecurityAuditor.logSecurityEvent(
        "USER_INFO_REQUEST_UNAUTHORIZED",
        { clientIP, error: tokenResult.error },
        "medium"
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const userResult = await getUserById(tokenResult.data.userId);
    if (!userResult.success) {
      SecurityAuditor.logSecurityEvent(
        "USER_INFO_FETCH_FAILED",
        { clientIP, userId: tokenResult.data.userId, error: userResult.error },
        "medium"
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch user information"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const safeUserData = {
      ...userResult.data
    };
    delete safeUserData.password;
    delete safeUserData.refreshTokens;
    SecurityAuditor.logSecurityEvent(
      "USER_INFO_REQUEST_SUCCESS",
      { clientIP, userId: tokenResult.data.userId },
      "low"
    );
    return new Response(
      JSON.stringify({
        success: true,
        data: safeUserData
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("User info API error:", error);
    SecurityAuditor.logSecurityEvent(
      "USER_INFO_REQUEST_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      "high"
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch user information"
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
