import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, destroySession, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/security";

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser(false);
    const body = await request.json();
    if (body.confirmation !== "注销账号") return fail("请输入“注销账号”确认", 422);
    if (!await verifyPassword(user.passwordHash, String(body.password ?? ""))) return fail("当前密码错误", 403);
    await db.$transaction(async (transaction) => {
      if (user.role === "ADMIN") {
        const administrators = await transaction.user.count({ where: { role: "ADMIN", deletedAt: null } });
        if (administrators <= 1) throw new Error("LAST_ADMIN");
      }
      await transaction.session.deleteMany({ where: { userId: user.id } });
      await transaction.user.update({ where: { id: user.id }, data: { deletedAt: new Date(), status: "DISABLED", sessionVersion: { increment: 1 } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await audit(user.id, "SELF_DELETE_ACCOUNT", "User", user.id, undefined, { softDeleted: true });
    await destroySession();
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_ADMIN") return fail("最后一名管理员不能注销账号", 409);
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
