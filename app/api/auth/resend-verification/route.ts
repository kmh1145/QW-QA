import { db } from "@/lib/db";
import { emailSchema } from "@/lib/validation";
import { addMinutes, createToken } from "@/lib/security";
import { sendVerificationMail } from "@/lib/mailer";
import { clientIp, rateLimit, assertSameOrigin } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { fail, handleError, ok } from "@/lib/api";
import { isEmailVerificationEnabled } from "@/lib/settings";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const { email } = await request.json(); const normalized = emailSchema.parse(email); const e = env();
    if (!await isEmailVerificationEnabled()) return ok({ message: "当前未启用邮箱验证，无需发送验证邮件" });
    if (!rateLimit(`verify-ip:${clientIp(request)}`, 10, 3600_000).allowed || !rateLimit(`verify-email:${normalized}`, 5, 3600_000).allowed) return fail("请求过于频繁，请稍后再试", 429);
    const user = await db.user.findUnique({ where: { email: normalized }, include: { emailTokens: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (user && !user.emailVerifiedAt) {
      const last = user.emailTokens[0];
      if (last && Date.now() - last.createdAt.getTime() < e.EMAIL_RESEND_COOLDOWN_SECONDS * 1000) return fail(`请等待 ${e.EMAIL_RESEND_COOLDOWN_SECONDS} 秒后重试`, 429);
      const token = createToken(); await db.emailVerificationToken.create({ data: { tokenHash: token.hash, userId: user.id, expiresAt: addMinutes(e.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES) } });
      await sendVerificationMail(user.email, token.raw);
    }
    return ok({ message: "如果该邮箱需要验证，我们会发送验证邮件" });
  } catch (error) { return handleError(error); }
}
