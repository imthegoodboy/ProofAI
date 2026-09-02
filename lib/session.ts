import crypto from "node:crypto";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { incrementRateLimit } from "@/lib/db";

const SESSION_COOKIE = "proofai_session";
const localSalt = "proofai-local-development";

function secretSalt() {
  return config.security.rateLimitSalt || localSalt;
}

export function hashSession(value: string) {
  return crypto.createHmac("sha256", secretSalt()).update(value).digest("hex");
}

export async function getSessionHash() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? hashSession(value) : null;
}

export async function getOrCreateSessionHash() {
  const cookieStore = await cookies();
  let value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) {
    value = crypto.randomBytes(32).toString("base64url");
    cookieStore.set(SESSION_COOKIE, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      priority: "high",
    });
  }
  return hashSession(value);
}

function clientAddress(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function checkRateLimit(
  request: Request,
  action: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const identity = hashSession(clientAddress(request));
  const hits = await incrementRateLimit(`${action}:${identity}:${bucket}`, (bucket + 1) * windowMs);
  return {
    allowed: hits <= limit,
    retryAfter: Math.max(1, Math.ceil(((bucket + 1) * windowMs - now) / 1000)),
  };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
