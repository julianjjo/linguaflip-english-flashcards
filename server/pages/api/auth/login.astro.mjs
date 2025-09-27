import { l as login } from '../../../chunks/index_DlrD0jmL.mjs';
import { g as getRateLimitConfig, c as checkRateLimit, I as InputSanitizer, b as SecurityError } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const POST = async ({ request }) => {
  try {
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitConfig = getRateLimitConfig("login");
    const rateLimitResult = checkRateLimit(
      `login:${clientIP}`,
      rateLimitConfig.maxAttempts,
      rateLimitConfig.windowMs
    );
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: rateLimitConfig.message,
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1e3
          )
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1e3
            ).toString()
          }
        }
      );
    }
    const body = await request.json();
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Todos los campos obligatorios deben ser completados"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const email = InputSanitizer.sanitizeString(
      body.email.toLowerCase().trim(),
      254
    );
    const password = body.password;
    const deviceInfo = body.deviceInfo ? InputSanitizer.sanitizeString(body.deviceInfo, 200) : void 0;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "El formato del correo electrónico no es válido"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const result = await login(email, password, clientIP, deviceInfo);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al iniciar sesión"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const response = new Response(
      JSON.stringify({
        success: true,
        data: {
          user: result.data?.user,
          accessToken: result.data?.tokens?.accessToken,
          expiresIn: result.data?.tokens?.expiresIn,
          refreshToken: result.data?.tokens?.refreshToken
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
    const cookies = [];
    if (result.data?.tokens?.accessToken) {
      const isSecure = process.env.NODE_ENV === "production" ? "Secure; " : "";
      cookies.push(
        `accessToken=${result.data.tokens.accessToken}; HttpOnly; ${isSecure}SameSite=Strict; Max-Age=${2 * 60 * 60}; Path=/`
      );
    }
    if (result.data?.tokens?.refreshToken) {
      const isSecure = process.env.NODE_ENV === "production" ? "Secure; " : "";
      cookies.push(
        `refreshToken=${result.data.tokens.refreshToken}; HttpOnly; ${isSecure}SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
      );
    }
    if (cookies.length > 0) {
      cookies.forEach((cookie) => {
        response.headers.append("Set-Cookie", cookie);
      });
    }
    return response;
  } catch (error) {
    console.error("Login API error:", error);
    if (error instanceof SecurityError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al iniciar sesión"
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
