import { db } from "@/lib/db";
import { loginSchema, normalizeEmail } from "@/lib/validation";
import { verifyPassword } from "@/lib/security";
import { createSession } from "@/lib/auth";
import { clientIp, rateLimit, assertSameOrigin } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";
import { isEmailVerificationEnabled } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIp(request);
    if (!rateLimit(`login:${ip}`, 10, 15 * 60_000).allowed) return fail("尝试次数过多，请稍后再试", 429);
    const input = loginSchema.parse(await request.json());
    const identifier = input.identifier.includes("@") ? normalizeEmail(input.identifier) : input.identifier;
    const user = await db.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }], deletedAt: null } });
    if (!user || !(await verifyPassword(user.passwordHash, input.password))) return fail("用户名、邮箱或密码错误。", 401);
    if (user.status === "DISABLED") return fail("账号已停用，请联系管理员。", 403);
    if (user.status === "BANNED" && (!user.bannedUntil || user.bannedUntil > new Date())) return fail(`账号已被封禁${user.banReason ? `：${user.banReason}` : ""}`, 403);
    if (await isEmailVerificationEnabled() && !user.emailVerifiedAt) return fail("邮箱尚未验证，请先完成邮箱验证。", 403);
    await createSession(user.id, user.sessionVersion, input.remember);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), ...(user.status === "BANNED" ? { status: "ACTIVE", bannedUntil: null } : {}) } });
    return ok({ user: { id: user.id, username: user.username, role: user.role }, mustChangePassword: user.mustChangePassword });
  } catch (error) { return handleError(error); }
}
