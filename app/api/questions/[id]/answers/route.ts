import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { answerSchema, hasSensitivePersonalInfo } from "@/lib/validation";
import { assertSameOrigin, rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request); const user = await requireApiUser(); const { id } = await params;
    if (!rateLimit(`answer:${user.id}`, 30, 3600_000).allowed) return fail("回答过于频繁", 429);
    const question = await db.question.findUnique({ where: { id } });
    if (!question || question.status !== "PUBLISHED") return fail("问题不存在", 404);
    if (question.isLocked) return fail("问题已锁定，不能继续回答", 409);
    const input = answerSchema.parse(await request.json());
    if (hasSensitivePersonalInfo(input.content)) return fail("内容可能包含敏感个人信息，请修改后提交", 422);
    const answer = await db.answer.create({ data: { content: input.content, questionId: id, authorId: user.id } });
    if (question.authorId !== user.id) await db.notification.create({ data: { userId: question.authorId, type: "QUESTION_ANSWERED", title: `${user.username} 回答了你的问题`, link: `/questions/${id}` } });
    return ok(answer, 201);
  } catch (e) { if (e instanceof AuthError) return fail(e.message, e.status); return handleError(e); }
}
