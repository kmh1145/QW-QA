import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

const schema = z.object({ name: z.string().trim().min(1).max(30), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), isActive: z.boolean() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const admin = await requireApiUser(); if (admin.role !== "ADMIN") return fail("需要管理员权限", 403); const { id } = await params; const before = await db.tag.findUnique({ where: { id } }); if (!before) return fail("标签不存在", 404); const input = schema.parse(await request.json()); const tag = await db.tag.update({ where: { id }, data: input }); await audit(admin.id, "UPDATE_TAG", "Tag", id, { name: before.name, slug: before.slug, isActive: before.isActive }, input); return ok(tag); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("标签名称或网址标识已存在", 409); if (error instanceof AuthError) return fail(error.message, error.status); return handleError(error); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const admin = await requireApiUser(); if (admin.role !== "ADMIN") return fail("需要管理员权限", 403); const { id } = await params; const tag = await db.tag.findUnique({ where: { id }, include: { _count: { select: { questions: true } } } }); if (!tag) return fail("标签不存在", 404); if (tag._count.questions > 0) return fail("标签已有问题引用，请停用而不是删除", 409); await db.tag.delete({ where: { id } }); await audit(admin.id, "DELETE_TAG", "Tag", id, { name: tag.name }); return ok({ deleted: true }); }
  catch (error) { if (error instanceof AuthError) return fail(error.message, error.status); return handleError(error); }
}
