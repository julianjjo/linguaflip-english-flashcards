import { r as refreshAccessToken } from '../../../chunks/index_DlrD0jmL.mjs';
import { a as SecurityAuditor } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const POST = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get("Cookie");
    let refreshToken = null;
    if (cookieHeader) {
      const cookies2 = cookieHeader.split(";").reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        },
        {}
      );
      refreshToken = cookies2.refreshToken || null;
    }
    if (!refreshToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Refresh token not found"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const result = await refreshAccessToken(refreshToken, clientIP);
    if (!result.success) {
      const response2 = new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Token refresh failed"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
      response2.headers.set(
        "Set-Cookie",
        "refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/"
      );
      return response2;
    }
    const response = new Response(
      JSON.stringify({
        success: true,
        data: {
          accessToken: result.data?.accessToken,
          expiresIn: result.data?.expiresIn
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
    const cookies = [];
    if (result.data?.accessToken) {
      const isSecure = process.env.NODE_ENV === "production" ? "Secure; " : "";
      cookies.push(
        `accessToken=${result.data.accessToken}; HttpOnly; ${isSecure}SameSite=Strict; Max-Age=${2 * 60 * 60}; Path=/`
      );
    }
    if (result.data?.refreshToken) {
      cookies.push(
        `refreshToken=${result.data.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
      );
    }
    if (cookies.length > 0) {
      cookies.forEach((cookie) => {
        response.headers.append("Set-Cookie", cookie);
      });
    }
    SecurityAuditor.logSecurityEvent(
      "TOKEN_REFRESH_SUCCESS",
      { clientIP },
      "low"
    );
    return response;
  } catch (error) {
    console.error("Token refresh API error:", error);
    SecurityAuditor.logSecurityEvent(
      "TOKEN_REFRESH_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      "medium"
    );
    const response = new Response(
      JSON.stringify({
        success: false,
        error: "Token refresh failed"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
    response.headers.set(
      "Set-Cookie",
      "refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/"
    );
    return response;
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
