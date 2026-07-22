import { IdentityBadge } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { identityLabel } from "@/components/user-badge";

const schema = z.object({ identityBadge: z.nativeEnum(IdentityBadge) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser();
    if (admin.role !== "ADMIN") return fail("需要管理员权限", 403);
    const { id } = await params;
    const { identityBadge } = schema.parse(await request.json());
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return fail("用户不存在", 404);
    if (target.identityBadge === identityBadge) return ok({ identityBadge });
    await db.user.update({ where: { id }, data: { identityBadge, identityChangedAt: new Date() } });
    await db.notification.create({ data: {
      userId: id,
      type: "IDENTITY_CHANGED",
      title: identityBadge === "NONE" ? "你的身份标识已被管理员取消" : `管理员将你的身份标识设置为“${identityLabel(identityBadge)}”`,
      link: "/me"
    } });
    await audit(admin.id, "SET_USER_IDENTITY", "User", id, { identityBadge: target.identityBadge }, { identityBadge });
    return ok({ identityBadge });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
