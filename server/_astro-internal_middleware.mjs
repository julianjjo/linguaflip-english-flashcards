import { e as defineMiddleware, s as sequence } from './chunks/vendor_Bpx6Nh43.mjs';
import 'es-module-lexer';
import 'kleur/colors';
import 'clsx';
import 'cookie';

const PROTECTED_ROUTES = [
  "/dashboard",
  "/study",
  "/settings",
  "/data",
  "/profile"
];
const ADMIN_ROUTES = ["/admin"];
const onRequest$1 = defineMiddleware(async (context, next) => {
  const { url, request, locals } = context;
  const pathname = url.pathname;
  if (pathname.startsWith("/api/")) {
    return next();
  }
  if (pathname.startsWith("/_astro/") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return next();
  }
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
  let isAuthenticated = false;
  let user = null;
  if (accessToken) {
    try {
      const jwt = await import('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || "linguaflip-jwt-secret-dev-2024";
      const decoded = jwt.default.verify(accessToken, jwtSecret);
      if (decoded.type === "access" && decoded.userId) {
        isAuthenticated = true;
        user = {
          userId: decoded.userId,
          email: decoded.email,
          username: decoded.username,
          role: decoded.role
        };
      }
    } catch (error) {
      console.warn(
        "Invalid token in middleware, continuing without auth",
        error
      );
    }
  }
  locals.isAuthenticated = isAuthenticated;
  locals.user = user;
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAdminRoute = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isProtectedRoute || isAdminRoute) {
    if (!isAuthenticated) {
      console.log(
        `Access to protected route ${pathname} without auth - allowing for development`
      );
    }
  }
  return next();
});

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
