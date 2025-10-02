import { v as verifyAccessToken } from '../../../chunks/index_DlrD0jmL.mjs';
import { a as SecurityAuditor } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const GET = async ({ request }) => {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authorization header missing or invalid"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const accessToken = authHeader.substring(7);
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const result = await verifyAccessToken(accessToken);
    if (!result.success) {
      SecurityAuditor.logSecurityEvent(
        "TOKEN_VERIFICATION_FAILED",
        { clientIP, error: result.error },
        "medium"
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Token verification failed"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    SecurityAuditor.logSecurityEvent(
      "TOKEN_VERIFICATION_SUCCESS",
      { clientIP, userId: result.data?.userId },
      "low"
    );
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          valid: true,
          payload: result.data
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Token verification API error:", error);
    SecurityAuditor.logSecurityEvent(
      "TOKEN_VERIFICATION_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" },
      "high"
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: "Token verification failed"
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
