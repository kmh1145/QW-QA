import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";

const resolutionSchema = z.object({
  status: z.enum(["RESOLVED", "IGNORED"]),
  resolution: z.string().trim().min(2).max(1000),
  action: z.enum(["NONE", "HIDE", "DELETE"]).default("NONE"),
  accountAction: z.enum(["NONE", "WARN", "BAN_TEMP", "BAN_PERMANENT"]).default("NONE"),
  banDays: z.coerce.number().int().min(1).max(365).default(7)
});

type Target = { authorId: string; link: string };

async function resolveTarget(targetType: string, targetId: string): Promise<Target> {
  if (targetType === "Question") {
    const target = await db.question.findUnique({ where: { id: targetId } });
    if (target) return { authorId: target.authorId, link: `/questions/${target.id}` };
  }
  if (targetType === "Answer") {
    const target = await db.answer.findUnique({ where: { id: targetId } });
    if (target) return { authorId: target.authorId, link: `/questions/${target.questionId}#answer-${target.id}` };
  }
  if (targetType === "Comment") {
    const target = await db.comment.findUnique({ where: { id: targetId }, include: { answer: { select: { questionId: true } } } });
    if (target) {
      const questionId = target.questionId ?? target.answer?.questionId;
      return { authorId: target.authorId, link: questionId ? `/questions/${questionId}#comment-${target.id}` : "/me/notifications" };
    }
  }
  if (targetType === "User") {
    const target = await db.user.findUnique({ where: { id: targetId } });
    if (target) return { authorId: target.id, link: `/users/${encodeURIComponent(target.username)}` };
  }
  throw new Error("TARGET_NOT_FOUND");
}

async function moderateTarget(targetType: string, targetId: string, action: "HIDE" | "DELETE") {
  const deletedAt = action === "DELETE" ? new Date() : undefined;
  if (targetType === "Question") {
    await db.question.update({ where: { id: targetId }, data: { status: action === "DELETE" ? "DELETED" : "HIDDEN", deletedAt } });
    return;
  }
  if (targetType === "Answer") {
    const target = await db.answer.findUniqueOrThrow({ where: { id: targetId } });
    await db.$transaction([
      db.answer.update({ where: { id: targetId }, data: { status: action === "DELETE" ? "DELETED" : "HIDDEN", deletedAt, isOfficial: action === "DELETE" ? false : target.isOfficial } }),
      ...(action === "DELETE" ? [db.question.updateMany({ where: { acceptedAnswerId: targetId }, data: { acceptedAnswerId: null, isSolved: false } })] : [])
    ]);
    return;
  }
  if (targetType === "Comment") {
    const target = await db.comment.findUniqueOrThrow({ where: { id: targetId } });
    await db.comment.update({ where: { id: targetId }, data: { content: action === "DELETE" ? "[该评论已删除]" : target.content, isHidden: action === "HIDE", deletedAt: action === "DELETE" ? new Date() : target.deletedAt } });
    return;
  }
  throw new Error("UNSUPPORTED_TARGET");
}

async function moderateAccount(input: z.infer<typeof resolutionSchema>, target: Target, adminId: string, reportId: string) {
  if (input.accountAction === "NONE") return;
  const user = await db.user.findUnique({ where: { id: target.authorId } });
  if (!user) throw new Error("TARGET_NOT_FOUND");
  if (input.accountAction === "WARN") {
    await db.userWarning.create({ data: { userId: user.id, issuedById: adminId, reportId, reason: input.resolution } });
    await db.notification.create({ data: { userId: user.id, type: "CONTENT_MODERATED", title: "你收到一条管理员警告", content: input.resolution, link: target.link } });
    return;
  }
  if (user.role === "ADMIN") throw new Error("CANNOT_BAN_ADMIN");
  const bannedUntil = input.accountAction === "BAN_TEMP" ? new Date(Date.now() + input.banDays * 86_400_000) : null;
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { status: "BANNED", banReason: input.resolution, bannedUntil, sessionVersion: { increment: 1 } } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.notification.create({ data: { userId: user.id, type: "CONTENT_MODERATED", title: input.accountAction === "BAN_TEMP" ? `账号已被封禁 ${input.banDays} 天` : "账号已被永久封禁", content: input.resolution, link: "/me/notifications" } })
  ]);
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
    const target = input.status === "RESOLVED" && (input.action !== "NONE" || input.accountAction !== "NONE") ? await resolveTarget(before.targetType, before.targetId) : undefined;
    if (input.status === "RESOLVED" && input.action !== "NONE" && !["Question", "Answer", "Comment"].includes(before.targetType)) throw new Error("UNSUPPORTED_TARGET");
    if (input.status === "RESOLVED" && (input.accountAction === "BAN_TEMP" || input.accountAction === "BAN_PERMANENT") && target) {
      const targetUser = await db.user.findUnique({ where: { id: target.authorId }, select: { role: true } });
      if (targetUser?.role === "ADMIN") throw new Error("CANNOT_BAN_ADMIN");
    }
    if (input.status === "RESOLVED" && input.action !== "NONE") await moderateTarget(before.targetType, before.targetId, input.action);
    if (input.status === "RESOLVED" && input.accountAction !== "NONE" && target) await moderateAccount(input, target, admin.id, id);
    const report = await db.report.update({ where: { id }, data: { status: input.status, resolution: input.resolution, resolvedAt: new Date(), resolvedById: admin.id } });
    await db.notification.create({ data: { userId: report.reporterId, type: "REPORT_RESULT", title: "你的举报已有处理结果", content: input.resolution, link: "/me/notifications" } });
    if (target && input.action !== "NONE" && target.authorId !== admin.id) await db.notification.create({ data: { userId: target.authorId, type: "CONTENT_MODERATED", title: `你的内容已被管理员${input.action === "DELETE" ? "删除" : "隐藏"}`, content: input.resolution, link: target.link } });
    await audit(admin.id, "RESOLVE_REPORT", "Report", id, { status: before.status }, { status: input.status, resolution: input.resolution, action: input.action, accountAction: input.accountAction, banDays: input.accountAction === "BAN_TEMP" ? input.banDays : undefined });
    return ok(report);
  } catch (error) {
    if (error instanceof Error && error.message === "TARGET_NOT_FOUND") return fail("被举报对象不存在", 404);
    if (error instanceof Error && error.message === "UNSUPPORTED_TARGET") return fail("该举报类型不支持内容隐藏或删除，可改用账号处置", 422);
    if (error instanceof Error && error.message === "CANNOT_BAN_ADMIN") return fail("不能通过举报处置封禁管理员，请先按管理员团队流程取消其权限", 409);
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
