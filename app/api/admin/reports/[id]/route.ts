import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";

const resolutionSchema = z.object({
  status: z.enum(["RESOLVED", "IGNORED"]),
  resolution: z.string().trim().min(2).max(1000),
  action: z.enum(["NONE", "HIDE", "DELETE"]).default("NONE")
});

async function moderateTarget(targetType: string, targetId: string, action: "NONE" | "HIDE" | "DELETE") {
  if (action === "NONE") return undefined;
  const deletedAt = action === "DELETE" ? new Date() : undefined;
  if (targetType === "Question") {
    const target = await db.question.findUnique({ where: { id: targetId } });
    if (!target) throw new Error("TARGET_NOT_FOUND");
    await db.question.update({ where: { id: targetId }, data: { status: action === "DELETE" ? "DELETED" : "HIDDEN", deletedAt } });
    return { authorId: target.authorId, link: `/questions/${targetId}` };
  }
  if (targetType === "Answer") {
    const target = await db.answer.findUnique({ where: { id: targetId } });
    if (!target) throw new Error("TARGET_NOT_FOUND");
    await db.$transaction([
      db.answer.update({ where: { id: targetId }, data: { status: action === "DELETE" ? "DELETED" : "HIDDEN", deletedAt, isOfficial: action === "DELETE" ? false : target.isOfficial } }),
      ...(action === "DELETE" ? [db.question.updateMany({ where: { acceptedAnswerId: targetId }, data: { acceptedAnswerId: null, isSolved: false } })] : [])
    ]);
    return { authorId: target.authorId, link: `/questions/${target.questionId}` };
  }
  if (targetType === "Comment") {
    const target = await db.comment.findUnique({ where: { id: targetId } });
    if (!target) throw new Error("TARGET_NOT_FOUND");
    await db.comment.update({ where: { id: targetId }, data: { content: action === "DELETE" ? "[该评论已删除]" : target.content, isHidden: action === "HIDE", deletedAt: action === "DELETE" ? new Date() : target.deletedAt } });
    return { authorId: target.authorId, link: target.questionId ? `/questions/${target.questionId}` : "/me/notifications" };
  }
  throw new Error("UNSUPPORTED_TARGET");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser();
    if (admin.role !== "ADMIN") return fail("需要管理员权限", 403);
    const { id } = await params;
    const before = await db.report.findUnique({ where: { id } });
    if (!before) return fail("举报不存在", 404);
    if (before.status !== "PENDING") return fail("该举报已经处理", 409);
    const input = resolutionSchema.parse(await request.json());
    const moderated = input.status === "RESOLVED" ? await moderateTarget(before.targetType, before.targetId, input.action) : undefined;
    const report = await db.report.update({ where: { id }, data: { status: input.status, resolution: input.resolution, resolvedAt: new Date(), resolvedById: admin.id } });
    await db.notification.create({ data: { userId: report.reporterId, type: "REPORT_RESULT", title: "你的举报已有处理结果", content: input.resolution, link: "/me/notifications" } });
    if (moderated && moderated.authorId !== admin.id) await db.notification.create({ data: { userId: moderated.authorId, type: "CONTENT_MODERATED", title: `你的内容已被管理员${input.action === "DELETE" ? "删除" : "隐藏"}`, content: input.resolution, link: moderated.link } });
    await audit(admin.id, "RESOLVE_REPORT", "Report", id, { status: before.status }, { status: input.status, resolution: input.resolution, action: input.action });
    return ok(report);
  } catch (error) {
    if (error instanceof Error && error.message === "TARGET_NOT_FOUND") return fail("被举报内容不存在", 404);
    if (error instanceof Error && error.message === "UNSUPPORTED_TARGET") return fail("该举报类型暂不支持自动处置", 422);
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
