import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

const schema = z.object({ ids: z.array(z.string().cuid()).min(1).max(100) });

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser();
    if (admin.role !== "ADMIN") return fail("需要管理员权限", 403);
    const { ids } = schema.parse(await request.json());
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.includes(admin.id)) return fail("不能在批量操作中删除当前登录的管理员账号", 409);
    const targets = await db.user.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      select: { id: true, role: true }
    });
    if (targets.length === 0) return fail("没有可删除的用户", 404);

    await db.$transaction(async (transaction) => {
      const administratorCount = await transaction.user.count({ where: { role: "ADMIN", deletedAt: null } });
      const selectedAdministratorCount = targets.filter((target) => target.role === "ADMIN").length;
      if (administratorCount - selectedAdministratorCount < 1) throw new Error("LAST_ADMIN");
      const targetIds = targets.map((target) => target.id);
      await transaction.session.deleteMany({ where: { userId: { in: targetIds } } });
      await transaction.user.updateMany({
        where: { id: { in: targetIds } },
        data: { deletedAt: new Date(), status: "DISABLED", sessionVersion: { increment: 1 } }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const deletedIds = targets.map((target) => target.id);
    await audit(admin.id, "BULK_DELETE_USERS", "User", "bulk", undefined, { ids: deletedIds, count: deletedIds.length });
    return ok({ count: deletedIds.length });
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_ADMIN") return fail("批量删除后系统必须至少保留一名管理员", 409);
    if (error instanceof AuthError) return fail(error.message, error.status);
    if (error instanceof z.ZodError) return fail("用户选择无效", 422, error.flatten().fieldErrors);
    return handleError(error);
  }
}
