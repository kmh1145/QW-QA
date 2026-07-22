import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { createToken, hashToken } from "./security";
import { isEmailVerificationEnabled } from "./settings";

const COOKIE = "qa_session";
function shouldUseSecureCookie() {
  return process.env.APP_URL?.startsWith("https://") ?? process.env.NODE_ENV === "production";
}

export async function createSession(userId: string, sessionVersion: number, remember = false) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + (remember ? 30 : 7) * 86400_000);
  const h = await headers();
  await db.session.create({ data: { tokenHash: token.hash, userId, sessionVersion, expiresAt, ipAddress: h.get("x-forwarded-for")?.split(",")[0], userAgent: h.get("user-agent") } });
  const jar = await cookies();
  jar.set(COOKIE, token.raw, { httpOnly: true, sameSite: "lax", secure: shouldUseSecureCookie(), path: "/", expires: expiresAt });
}
export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) await db.session.deleteMany({ where: { tokenHash: hashToken(raw) } });
  jar.delete(COOKIE);
}
export async function getCurrentUser() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || session.sessionVersion !== session.user.sessionVersion || session.user.deletedAt) return null;
  return session.user;
}
export async function requireUser(options: { verified?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/login?blocked=1");
  if (options.verified !== false && await isEmailVerificationEnabled() && !user.emailVerifiedAt) redirect("/verify-email");
  return user;
}
export async function requireAdmin() { const user = await requireUser(); if (user.role !== "ADMIN") redirect("/"); return user; }
export async function requireApiUser(verified = true) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHORIZED", 401);
  if (user.status !== "ACTIVE") throw new AuthError("ACCOUNT_BLOCKED", 403);
  if (verified && await isEmailVerificationEnabled() && !user.emailVerifiedAt) throw new AuthError("EMAIL_NOT_VERIFIED", 403);
  return user;
}
export class AuthError extends Error { constructor(message: string, readonly status: number) { super(message); } }
