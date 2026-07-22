import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(30),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "网址标识只能包含小写字母、数字和连字符"),
  description: z.string().trim().max(200).optional().default(""),
  sortOrder: z.number().int().min(0).max(9999)
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser();
    if (admin.role !== "ADMIN") return fail("需要管理员权限", 403);
    const input = categorySchema.parse(await request.json());
    const category = await db.category.create({ data: { ...input, isActive: true } });
    await audit(admin.id, "CREATE_CATEGORY", "Category", category.id, undefined, input);
    return ok(category, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("分类名称或网址标识已存在", 409);
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
