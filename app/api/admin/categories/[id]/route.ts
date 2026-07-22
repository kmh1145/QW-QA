import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(30),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "网址标识只能包含小写字母、数字和连字符"),
  description: z.string().trim().max(200),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean()
});

async function adminUser() {
  const admin = await requireApiUser();
  if (admin.role !== "ADMIN") throw new AuthError("需要管理员权限", 403);
  return admin;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await adminUser();
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const previous = await db.category.findUnique({ where: { id } });
    if (!previous) return fail("分类不存在", 404);
    const category = await db.category.update({ where: { id }, data: input });
    await audit(admin.id, "UPDATE_CATEGORY", "Category", id, previous, input);
    return ok(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("分类名称或网址标识已存在", 409);
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await adminUser();
    const { id } = await params;
    const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { questions: true } } } });
    if (!category) return fail("分类不存在", 404);
    if (category._count.questions > 0) return fail("该分类下已有问题，请先停用或迁移问题，不能直接删除", 409);
    await db.category.delete({ where: { id } });
    await audit(admin.id, "DELETE_CATEGORY", "Category", id, category, undefined);
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
