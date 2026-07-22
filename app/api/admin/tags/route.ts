import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";

const schema = z.object({ name: z.string().trim().min(1).max(30), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });
export async function POST(request: Request) {
  try { assertSameOrigin(request); const admin = await requireApiUser(); if (admin.role !== "ADMIN") return fail("需要管理员权限", 403); const input = schema.parse(await request.json()); const tag = await db.tag.create({ data: input }); await audit(admin.id, "CREATE_TAG", "Tag", tag.id, undefined, input); return ok(tag, 201); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("标签名称或网址标识已存在", 409); if (error instanceof AuthError) return fail(error.message, error.status); return handleError(error); }
}
