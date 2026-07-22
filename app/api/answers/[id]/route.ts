import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { hasSensitivePersonalInfo } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";

const editSchema = z.object({ content: z.string().trim().min(2).max(30000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const { id } = await params;
    const answer = await db.answer.findUnique({ where: { id } });
    if (!answer || answer.deletedAt) return fail("回答不存在", 404);
    if (answer.authorId !== user.id && user.role !== "ADMIN") return fail("无权编辑该回答", 403);
    const input = editSchema.parse(await request.json());
    if (hasSensitivePersonalInfo(input.content)) return fail("内容可能包含敏感个人信息", 422);
    const updated = await db.answer.update({ where: { id }, data: input });
    if (user.role === "ADMIN" && answer.authorId !== user.id) await audit(user.id, "EDIT_ANSWER", "Answer", id, undefined, { edited: true });
    return ok(updated);
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
    const answer = await db.answer.findUnique({ where: { id }, include: { acceptedBy: true } });
    if (!answer || answer.deletedAt) return fail("回答不存在", 404);
    if (answer.authorId !== user.id && user.role !== "ADMIN") return fail("无权删除该回答", 403);
    await db.$transaction(async (tx) => {
      if (answer.acceptedBy) await tx.question.update({ where: { id: answer.acceptedBy.id }, data: { acceptedAnswerId: null, isSolved: false } });
      await tx.answer.update({ where: { id }, data: { content: "[该回答已删除]", deletedAt: new Date(), status: "DELETED", isOfficial: false } });
    });
    if (user.role === "ADMIN" && answer.authorId !== user.id) {
      await audit(user.id, "DELETE_ANSWER", "Answer", id, undefined, { status: "DELETED" });
      await db.notification.create({ data: { userId: answer.authorId, type: "CONTENT_MODERATED", title: "你的回答已被管理员删除", link: "/me/notifications" } });
    }
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
