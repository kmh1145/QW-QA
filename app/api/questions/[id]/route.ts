import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { hasSensitivePersonalInfo } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";

const editSchema = z.object({
  title: z.string().trim().min(8).max(150),
  content: z.string().trim().min(20).max(30000),
  categoryId: z.string().min(1)
});
const moderationSchema = z.object({
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  status: z.enum(["PUBLISHED", "HIDDEN"]).optional()
}).refine((value) => Object.keys(value).length > 0, "没有需要修改的管理字段");

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const { id } = await params;
    const question = await db.question.findUnique({ where: { id } });
    if (!question || question.deletedAt) return fail("问题不存在", 404);
    const body: unknown = await request.json();
    const isModeration = typeof body === "object" && body !== null && ("isPinned" in body || "isLocked" in body || "status" in body);
    if (isModeration) {
      if (user.role !== "ADMIN") return fail("需要管理员权限", 403);
      const input = moderationSchema.parse(body);
      const updated = await db.question.update({ where: { id }, data: input });
      await audit(user.id, "MODERATE_QUESTION", "Question", id, { isPinned: question.isPinned, isLocked: question.isLocked, status: question.status }, input);
      return ok(updated);
    }
    if (question.authorId !== user.id && user.role !== "ADMIN") return fail("无权编辑该问题", 403);
    const input = editSchema.parse(body);
    if (hasSensitivePersonalInfo(`${input.title} ${input.content}`)) return fail("内容可能包含敏感个人信息", 422);
    const updated = await db.question.update({ where: { id }, data: input });
    if (user.role === "ADMIN" && question.authorId !== user.id) await audit(user.id, "EDIT_QUESTION", "Question", id, { title: question.title }, { title: input.title });
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
    const question = await db.question.findUnique({ where: { id } });
    if (!question || question.deletedAt) return fail("问题不存在", 404);
    if (question.authorId !== user.id && user.role !== "ADMIN") return fail("无权删除该问题", 403);
    await db.question.update({ where: { id }, data: { deletedAt: new Date(), status: "DELETED" } });
    if (user.role === "ADMIN" && question.authorId !== user.id) {
      await audit(user.id, "DELETE_QUESTION", "Question", id, { status: question.status }, { status: "DELETED" });
      await db.notification.create({ data: { userId: question.authorId, type: "CONTENT_MODERATED", title: "你的问题已被管理员删除", link: "/me/notifications" } });
    }
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
