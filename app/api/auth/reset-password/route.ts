import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashToken, hashPassword } from "@/lib/security";
import { passwordSchema } from "@/lib/validation";
import { assertSameOrigin } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const body = await request.json(); const password = passwordSchema.parse(body.password);
    if (password !== body.confirmPassword) return fail("两次输入的密码不一致", 422);
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(body.token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) return fail("重置链接无效或已过期", 400);
    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gte: new Date() } }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) throw new Error("TOKEN_ALREADY_USED");
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, passwordResetAt: new Date(), sessionVersion: { increment: 1 }, mustChangePassword: false } });
      await tx.session.deleteMany({ where: { userId: record.userId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return ok({ message: "密码已重置，请重新登录" });
  } catch (error) { if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") return fail("重置链接无效或已过期", 400); return handleError(error); }
}
