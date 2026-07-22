import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser();
    if (admin.role !== "ADMIN") return fail("需要管理员权限", 403);
    const { id } = await params;
    const document = await db.knowledgeDocument.findUnique({
      where: { id },
      select: { id: true, title: true, _count: { select: { chunks: true } } }
    });
    if (!document) return fail("知识库资料不存在", 404);
    await db.knowledgeDocument.delete({ where: { id } });
    await audit(admin.id, "DELETE_KNOWLEDGE", "KnowledgeDocument", id, {
      title: document.title,
      chunkCount: document._count.chunks
    });
    return ok({ id });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
