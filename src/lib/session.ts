/**
 * Sesion guardada en Cloudflare KV (env.SESSION) con TTL.
 * Cookie: fl_session = randomToken, httpOnly + secure.
 */
import { env } from "cloudflare:workers";
import { randomToken } from "./auth";

const COOKIE_NAME = "fl_session";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export interface Session {
  userId: number;
  tenantId: number;
  email: string;
  name: string;
}

function kv() {
  return (env as { SESSION: KVNamespace }).SESSION;
}

export async function createSession(s: Session): Promise<string> {
  const token = randomToken(32);
  await kv().put(`sess:${token}`, JSON.stringify(s), { expirationTtl: TTL_SECONDS });
  return token;
}

export async function readSession(token: string): Promise<Session | null> {
  if (!token) return null;
  const raw = await kv().get(`sess:${token}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as Session; } catch { return null; }
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await kv().delete(`sess:${token}`);
}

export function buildCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
}
export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
export const SESSION_COOKIE = COOKIE_NAME;
