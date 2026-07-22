import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { hasSensitivePersonalInfo } from "@/lib/validation";
import { fail, handleError, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

const editSchema = z.object({ content: z.string().trim().min(1, "评论不能为空").max(1000, "评论最多 1000 字") });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const { id } = await params;
    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment || comment.deletedAt) return fail("评论不存在", 404);
    if (comment.authorId !== user.id) return fail("只能编辑自己的评论", 403);
    const input = editSchema.parse(await request.json());
    if (hasSensitivePersonalInfo(input.content)) return fail("评论可能包含敏感个人信息", 422);
    const updated = await db.comment.update({ where: { id }, data: { content: input.content } });
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
    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment || comment.deletedAt) return fail("评论不存在", 404);
    if (comment.authorId !== user.id && user.role !== "ADMIN") return fail("无权删除该评论", 403);
    await db.comment.update({ where: { id }, data: { content: "[该评论已删除]", isHidden: false, deletedAt: new Date() } });
    if (user.role === "ADMIN" && comment.authorId !== user.id) {
      await audit(user.id, "DELETE_COMMENT", "Comment", id, { content: comment.content }, { deletedAt: new Date().toISOString() });
      await db.notification.create({ data: { userId: comment.authorId, type: "CONTENT_MODERATED", title: "你的评论已被管理员删除", link: "/me/notifications" } });
    }
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
