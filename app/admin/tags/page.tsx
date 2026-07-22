import { db } from "@/lib/db";
import { TagManager } from "@/components/tag-manager";
export default async function TagsPage() { const rows = await db.tag.findMany({ include: { _count: { select: { questions: true } } }, orderBy: { name: "asc" } }); return <><h1 className="text-3xl font-bold">标签管理</h1><p className="mt-2 text-slate-500">管理员可新增、编辑、停用或删除没有问题引用的标签。</p><TagManager tags={rows.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug, isActive: tag.isActive, questionCount: tag._count.questions }))} /></>; }
