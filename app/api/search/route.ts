import { db } from "@/lib/db"; import { ok } from "@/lib/api";
export async function GET(request: Request) {
  const url = new URL(request.url); const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100); const sort = url.searchParams.get("sort") ?? "relevance"; if (!q) return ok({ questions: [], answers: [], announcements: [], knowledge: [] });
  const questionWhere = { status: "PUBLISHED" as const, OR: [{ title: { contains: q, mode: "insensitive" as const } }, { content: { contains: q, mode: "insensitive" as const } }, { category: { name: { contains: q, mode: "insensitive" as const } } }, { tags: { some: { tag: { name: { contains: q, mode: "insensitive" as const } } } } }] };
  const [questions, answers, announcements, knowledge] = await Promise.all([
    db.question.findMany({ where: questionWhere, include: { category: true, author: { select: { username: true, role: true, identityBadge: true } }, _count: { select: { answers: true, votes: true } } }, orderBy: sort === "latest" ? { createdAt: "desc" } : sort === "hot" ? { viewCount: "desc" } : { isSolved: "desc" }, take: 30 }),
    db.answer.findMany({ where: { status: "PUBLISHED", content: { contains: q, mode: "insensitive" } }, include: { question: { select: { id: true, title: true } }, author: { select: { username: true, identityBadge: true } } }, take: 10 }),
    db.announcement.findMany({ where: { isPublic: true, OR: [{ title: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] }, take: 10 }),
    db.knowledgeDocument.findMany({ where: { isEnabled: true, status: "READY", OR: [{ title: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] }, select: { id: true, title: true, source: true, updatedAt: true }, take: 10 })
  ]); return ok({ questions, answers, announcements, knowledge });
}
