import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { addMinutes, createToken, hashPassword } from "@/lib/security";
import { sendVerificationMail } from "@/lib/mailer";
import { clientIp, rateLimit, assertSameOrigin } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { handleError, fail, ok } from "@/lib/api";
import { isEmailVerificationEnabled } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!rateLimit(`register:${clientIp(request)}`, 5, 3600_000).allowed) return fail("请求过于频繁，请稍后再试", 429);
    const input = registerSchema.parse(await request.json());
    const duplicate = await db.user.findFirst({ where: { OR: [{ email: input.email }, { username: input.username }] }, select: { id: true } });
    if (duplicate) return fail("用户名或邮箱已被使用", 409);
    const emailVerificationRequired = await isEmailVerificationEnabled();
    const token = emailVerificationRequired ? createToken() : null;
    const user = await db.user.create({ data: {
      username: input.username, email: input.email, passwordHash: await hashPassword(input.password),
      emailVerifiedAt: emailVerificationRequired ? undefined : new Date(),
      ...(token ? { emailTokens: { create: { tokenHash: token.hash, expiresAt: addMinutes(env().EMAIL_VERIFICATION_TOKEN_TTL_MINUTES) } } } : {})
    } });
    if (token) await sendVerificationMail(user.email, token.raw);
    return ok({ message: emailVerificationRequired ? "注册成功，请查收验证邮件" : "注册成功，可以直接登录", emailVerificationRequired }, 201);
  } catch (error) { return handleError(error); }
}
