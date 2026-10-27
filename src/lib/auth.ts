/**
 * Admin authentication for the pandal editor. There are no user accounts: a
 * single ADMIN_PASSWORD environment variable gates /admin, and the session
 * cookie holds an HMAC of its own expiry signed with that password (so rotating
 * the password instantly invalidates every existing session).
 */
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "nkp_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function adminConfigured(): boolean {
  return secret().length >= 6;
}

function digestsMatch(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function passwordMatches(input: string): boolean {
  if (!adminConfigured() || typeof input !== "string" || input.length === 0) return false;
  return digestsMatch(input, secret());
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function issueToken(now: number = Date.now()): string {
  const expiry = String(now + SESSION_TTL_MS);
  return `${expiry}.${sign(expiry)}`;
}

export function verifyToken(token: string | undefined | null): boolean {
  if (!token || !adminConfigured()) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature) return false;
  const expiryNumber = Number(expiry);
  if (!Number.isFinite(expiryNumber) || expiryNumber < Date.now()) return false;
  return digestsMatch(signature, sign(expiry));
}

export function adminCookieHeader(token: string): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export function clearAdminCookieHeader(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function isAdminRequest(request: Request): boolean {
  return verifyToken(readCookie(request.headers.get("cookie"), ADMIN_COOKIE));
}

/**
 * Best-effort origin check for state-changing requests. Public endpoints stay
 * usable from the deployed domain and from localhost during development.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches from the app itself
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
