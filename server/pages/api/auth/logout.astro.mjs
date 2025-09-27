import { a as logout } from '../../../chunks/index_DlrD0jmL.mjs';
import { a as SecurityAuditor } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const POST = async ({ request }) => {
  try {
    const authHeader = request.headers.get("Authorization");
    let accessToken = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }
    const cookieHeader = request.headers.get("Cookie");
    let refreshToken = null;
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        },
        {}
      );
      refreshToken = cookies.refreshToken || null;
    }
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logout(accessToken, refreshToken, clientIP);
    const response = new Response(
      JSON.stringify({
        success: true,
        message: "Logged out successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
    response.headers.set(
      "Set-Cookie",
      "refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/"
    );
    SecurityAuditor.logSecurityEvent(
      "LOGOUT_API_SUCCESS",
      {
        clientIP,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      },
      "low"
    );
    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    SecurityAuditor.logSecurityEvent(
      "LOGOUT_API_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      "medium"
    );
    const response = new Response(
      JSON.stringify({
        success: true,
        message: "Logged out (client-side cleanup)"
      }),
      {
        status: 200,
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
