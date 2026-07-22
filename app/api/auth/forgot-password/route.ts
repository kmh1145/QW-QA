import { db } from "@/lib/db";
import { emailSchema } from "@/lib/validation";
import { addMinutes, createToken } from "@/lib/security";
import { sendPasswordResetMail } from "@/lib/mailer";
import { clientIp, rateLimit, assertSameOrigin } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { fail, handleError, ok } from "@/lib/api";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const email = emailSchema.parse((await request.json()).email);
    if (!rateLimit(`reset-ip:${clientIp(request)}`, 10, 3600_000).allowed || !rateLimit(`reset-email:${email}`, 5, 3600_000).allowed) return fail("请求过于频繁，请稍后再试", 429);
    const user = await db.user.findUnique({ where: { email } });
    if (user && user.status === "ACTIVE" && !user.deletedAt) { const token = createToken(); await db.passwordResetToken.create({ data: { tokenHash: token.hash, userId: user.id, expiresAt: addMinutes(env().PASSWORD_RESET_TOKEN_TTL_MINUTES) } }); await sendPasswordResetMail(user.email, token.raw); }
    return ok({ message: "如果该邮箱已注册，我们会发送重置邮件" });
  } catch (error) { return handleError(error); }
}
