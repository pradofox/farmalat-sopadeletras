/**
 * Middleware: lee cookie de sesion (KV), hidrata locals con userId + tenantId.
 * Protege rutas /app/* y APIs sensibles redirigiendo a /login si no hay sesion.
 */
import { defineMiddleware } from "astro:middleware";
import { readSession, SESSION_COOKIE } from "./lib/session";

const PROTECTED_PREFIXES = ["/app"];
const PROTECTED_API = [
  "/api/sales",
  "/api/products",
  "/api/products/search",
  "/api/products/import",
];
const PUBLIC_ROUTES = ["/login", "/signup", "/api/auth/login", "/api/auth/signup", "/api/auth/logout", "/api/seed"];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const token = context.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = await readSession(token);

  context.locals.tenantId = session?.tenantId ?? 0;
  context.locals.userId = session?.userId ?? null;
  (context.locals as any).session = session;

  // Rutas publicas siempre pasan
  if (PUBLIC_ROUTES.includes(path)) return next();

  // Rutas protegidas: redirigir si no hay sesion
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p))
    || PROTECTED_API.some((p) => path === p || path.startsWith(p + "/"));

  if (isProtected && !session) {
    if (path.startsWith("/api/")) {
      return new Response(JSON.stringify({ ok: false, error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  return next();
});
