import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin, rateLimit } from "@/lib/rate-limit";
import { hasSensitivePersonalInfo } from "@/lib/validation";
import { fail, handleError, ok } from "@/lib/api";

const commentSchema = z.object({
  content: z.string().trim().min(1, "评论不能为空").max(1000, "评论最多 1000 字"),
  answerId: z.string().min(1),
  parentId: z.string().optional()
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    if (!rateLimit(`comment:${user.id}`, 40, 3600_000).allowed) return fail("评论过于频繁", 429);
    const input = commentSchema.parse(await request.json());
    if (hasSensitivePersonalInfo(input.content)) return fail("评论可能包含敏感个人信息", 422);
    const answer = await db.answer.findFirst({ where: { id: input.answerId, deletedAt: null }, include: { question: { select: { id: true, isLocked: true } } } });
    if (!answer) return fail("回答不存在", 404);
    if (answer.question.isLocked) return fail("问题已锁定，不能继续评论", 409);

    let recipient = answer.authorId;
    if (input.parentId) {
      const parent = await db.comment.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.deletedAt || parent.parentId) return fail("评论最多支持一层回复", 422);
      if (parent.answerId !== input.answerId) return fail("回复目标与回答不一致", 422);
      recipient = parent.authorId;
    }

    const comment = await db.comment.create({ data: { ...input, authorId: user.id }, include: { author: true } });
    if (recipient !== user.id) await db.notification.create({ data: {
      userId: recipient,
      type: input.parentId ? "COMMENT_REPLIED" : "QUESTION_COMMENTED",
      title: input.parentId ? `${user.username} 回复了你的评论` : `${user.username} 评论了你的回答`,
      link: `/questions/${answer.question.id}#answer-${answer.id}`
    } });
    return ok(comment, 201);
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
