/**
 * Cliente Drizzle conectado a Cloudflare D1.
 * En Astro 6 + adapter Cloudflare se usa env desde "cloudflare:workers".
 */
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "../db/schema";

export function getDb() {
  return drizzle((env as { DB: D1Database }).DB, { schema });
}

export function getEnv() {
  return env as {
    DB: D1Database;
    SESSION: KVNamespace;
  };
}

export type DB = ReturnType<typeof getDb>;
export { schema };
