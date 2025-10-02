import { b as register } from '../../../chunks/index_DlrD0jmL.mjs';
import { g as getRateLimitConfig, c as checkRateLimit, I as InputSanitizer, b as SecurityError } from '../../../chunks/utils_B4MKaY9u.mjs';
export { f as renderers } from '../../../chunks/vendor_Bpx6Nh43.mjs';

const POST = async ({ request }) => {
  try {
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitConfig = getRateLimitConfig("register");
    const rateLimitResult = checkRateLimit(
      `register:${clientIP}`,
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
    if (!body.email || !body.password || !body.confirmPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email, password, and password confirmation are required"
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
    const confirmPassword = body.confirmPassword;
    const username = body.username ? InputSanitizer.sanitizeString(body.username.trim(), 50) : void 0;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid email format"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Password must be at least 8 characters long"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    if (!hasLowerCase || !hasUpperCase || !hasNumbers) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Password must contain lowercase, uppercase, and numeric characters"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Passwords do not match"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (username) {
      if (username.length < 3 || username.length > 50) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Username must be between 3 and 50 characters"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Username can only contain letters, numbers, underscores, and hyphens"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    const result = await register({
      email,
      password,
      username,
      clientIP
    });
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Registration failed"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const response = new Response(
      JSON.stringify({
        success: true,
        data: {
          user: result.data?.user,
          tokens: {
            accessToken: result.data?.tokens?.accessToken,
            refreshToken: result.data?.tokens?.refreshToken,
            expiresIn: result.data?.tokens?.expiresIn,
            tokenType: "Bearer"
          }
        },
        message: "Registration successful"
      }),
      {
        status: 201,
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
    console.error("Registration API error:", error);
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
