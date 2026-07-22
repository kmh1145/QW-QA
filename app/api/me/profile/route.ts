import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { profileSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser(false);
    const input = profileSchema.parse(await request.json());
    const updated = await db.user.update({ where: { id: user.id }, data: { username: input.username, bio: input.bio || null, avatarUrl: input.avatarUrl || null } });
    return ok({ username: updated.username, bio: updated.bio, avatarUrl: updated.avatarUrl });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("用户名已被使用", 409);
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
