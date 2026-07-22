import { z } from "zod";
import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

const schema = z.object({ value: z.union([z.literal(1), z.literal(-1), z.null()]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const { value } = schema.parse(await request.json());
    const { id } = await params;
    const message = await db.aIMessage.findFirst({ where: { id, role: "ASSISTANT", conversation: { userId: user.id, deletedAt: null } }, select: { id: true } });
    if (!message) return fail("AI 回答不存在", 404);
    await db.aIMessage.update({ where: { id }, data: { feedback: value } });
    return ok({ feedback: value });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
