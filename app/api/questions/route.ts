import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { questionSchema, hasSensitivePersonalInfo } from "@/lib/validation";
import { assertSameOrigin, rateLimit } from "@/lib/rate-limit";
import { fail, handleError, ok } from "@/lib/api";

function slugify(title: string) { return `${title.toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "question"}-${crypto.randomUUID().slice(0, 8)}`; }
export async function GET(request: Request) {
  const url = new URL(request.url); const page = Math.max(1, Number(url.searchParams.get("page")) || 1); const category = url.searchParams.get("category"); const solved = url.searchParams.get("solved");
  const where = { status: "PUBLISHED" as const, ...(category ? { category: { slug: category } } : {}), ...(solved ? { isSolved: solved === "true" } : {}) };
  const [items, total] = await Promise.all([
    db.question.findMany({ where, include: { author: { select: { username: true, role: true, identityBadge: true, avatarUrl: true } }, category: true, _count: { select: { answers: true, votes: true, favorites: true } } }, orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }], skip: (page - 1) * 20, take: 20 }),
    db.question.count({ where })
  ]);
  return ok({ items, total, page });
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const user = await requireApiUser();
    if (!rateLimit(`ask:${user.id}`, 10, 3600_000).allowed) return fail("发布过于频繁", 429);
    const input = questionSchema.parse(await request.json());
    if (hasSensitivePersonalInfo(`${input.title} ${input.content}`)) return fail("内容可能包含手机号、身份证号、学号或精确住址，请移除敏感个人信息", 422);
    const question = await db.question.create({ data: { title: input.title, slug: slugify(input.title), content: input.content, authorId: user.id, categoryId: input.categoryId, status: input.draft ? "DRAFT" : "PUBLISHED", tags: { create: input.tagIds.map((tagId) => ({ tagId })) } } });
    return ok(question, 201);
  } catch (e) { if (e instanceof AuthError) return fail(e.message, e.status); return handleError(e); }
}
