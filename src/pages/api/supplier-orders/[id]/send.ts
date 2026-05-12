export const prerender = false;
import type { APIRoute } from "astro";
import { getDb, schema } from "../../../../lib/db";
import { and, eq } from "drizzle-orm";

export const POST: APIRoute = async ({ params, locals }) => {
  const db = getDb();
  const tenantId = locals.tenantId;
  const orderId = Number(params.id);

  await db.update(schema.supplierOrders)
    .set({ status: "sent", sentAt: new Date() })
    .where(and(eq(schema.supplierOrders.id, orderId), eq(schema.supplierOrders.tenantId, tenantId)));

  return Response.json({ ok: true });
};
