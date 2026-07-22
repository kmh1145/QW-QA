import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { clientIp, assertSameOrigin, rateLimit } from "@/lib/rate-limit";
import { addMinutes, createToken, verifyPassword } from "@/lib/security";
import { emailSchema } from "@/lib/validation";
import { sendEmailChangeMail } from "@/lib/mailer";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser(false);
    const body = await request.json();
    const pendingEmail = emailSchema.parse(body.email);
    if (pendingEmail === user.email) return fail("新邮箱不能与当前邮箱相同", 422);
    if (!await verifyPassword(user.passwordHash, String(body.password ?? ""))) return fail("当前密码错误", 403);
    if (!rateLimit(`email-change-user:${user.id}`, 3, 3600_000).allowed || !rateLimit(`email-change-ip:${clientIp(request)}`, 10, 3600_000).allowed) return fail("请求过于频繁，请稍后再试", 429);
    if (await db.user.findUnique({ where: { email: pendingEmail }, select: { id: true } })) return fail("该邮箱已被使用", 409);
    const token = createToken();
    await db.$transaction([
      db.emailVerificationToken.updateMany({ where: { userId: user.id, pendingEmail: { not: null }, usedAt: null }, data: { usedAt: new Date() } }),
      db.emailVerificationToken.create({ data: { userId: user.id, pendingEmail, tokenHash: token.hash, expiresAt: addMinutes(env().EMAIL_VERIFICATION_TOKEN_TTL_MINUTES) } })
    ]);
    await sendEmailChangeMail(pendingEmail, token.raw);
    return ok({ message: "确认邮件已发送到新邮箱" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("该邮箱已被使用", 409);
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
