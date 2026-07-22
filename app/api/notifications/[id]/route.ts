import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser(false);
    const { id } = await params;
    const result = await db.notification.updateMany({
      where: { id, userId: user.id, deletedAt: null },
      data: { deletedAt: new Date() }
    });
    if (result.count !== 1) return fail("通知不存在", 404);
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
