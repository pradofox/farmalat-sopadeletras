/**
 * Middleware: resuelve tenant activo y lo expone en locals.
 * En Bloque D se agregara auth real con cookie de sesion.
 * Por ahora resuelve por slug fijo "alfa" (Farmacia Alfa, piloto).
 */
import { defineMiddleware } from "astro:middleware";
import { getDb, schema } from "./lib/db";
import { eq } from "drizzle-orm";

const DEFAULT_TENANT_SLUG = "alfa";

let cachedTenantId: number | null = null;
let cachedUserId: number | null = null;

export const onRequest = defineMiddleware(async (context, next) => {
  if (cachedTenantId == null) {
    try {
      const db = getDb();
      const [tenant] = await db
        .select({ id: schema.tenants.id })
        .from(schema.tenants)
        .where(eq(schema.tenants.slug, DEFAULT_TENANT_SLUG))
        .limit(1);
      if (tenant) {
        cachedTenantId = tenant.id;
        const [user] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.tenantId, tenant.id))
          .limit(1);
        cachedUserId = user?.id ?? null;
      }
    } catch {
      // Si el binding aun no esta listo (ej: ruta estatica) saltamos
    }
  }
  context.locals.tenantId = cachedTenantId ?? 1;
  context.locals.userId = cachedUserId;
  return next();
});
