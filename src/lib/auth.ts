/**
 * Hash y verificacion de passwords con PBKDF2 (WebCrypto nativo en Workers).
 * Formato hash: pbkdf2$iterations$salt_b64$hash_b64
 */
const ITERATIONS = 100_000;
const KEY_LENGTH = 32;

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    KEY_LENGTH * 8,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt.buffer)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const actual = new Uint8Array(await pbkdf2(password, salt, iterations));
  if (actual.length !== expected.length) return false;
  let same = 0;
  for (let i = 0; i < actual.length; i++) same |= actual[i] ^ expected[i];
  return same === 0;
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toBase64(arr.buffer).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
