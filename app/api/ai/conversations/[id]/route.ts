import { z } from "zod";
import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const title = z.string().trim().min(1).max(60).parse((await request.json()).title);
    const { id } = await params;
    const updated = await db.aIConversation.updateMany({ where: { id, userId: user.id, deletedAt: null }, data: { title } });
    if (updated.count !== 1) return fail("对话不存在", 404);
    return ok({ title });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const { id } = await params;
    const updated = await db.aIConversation.updateMany({ where: { id, userId: user.id, deletedAt: null }, data: { deletedAt: new Date() } });
    if (updated.count !== 1) return fail("对话不存在", 404);
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
