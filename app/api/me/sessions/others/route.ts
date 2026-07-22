import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, getCurrentSessionTokenHash, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser(false);
    const currentTokenHash = await getCurrentSessionTokenHash();
    if (!currentTokenHash) return fail("当前 Session 不存在", 401);
    const result = await db.session.deleteMany({ where: { userId: user.id, tokenHash: { not: currentTokenHash } } });
    return ok({ count: result.count });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
