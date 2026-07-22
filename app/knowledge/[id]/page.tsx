import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Markdown } from "@/lib/markdown";

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const document = await db.knowledgeDocument.findUnique({ where: { id: (await params).id } });
  if (!document || !document.isEnabled || document.status !== "READY") notFound();
  return <main className="container-page max-w-3xl py-10"><article className="card"><span className="rounded-lg bg-brand-50 px-2.5 py-1 text-sm text-brand-800 dark:bg-brand-950 dark:text-brand-200">学校资料</span><h1 className="mt-4 text-3xl font-bold">{document.title}</h1><p className="mt-3 text-sm text-slate-500">来源：{document.source || "管理员录入"} · 更新于 {document.updatedAt.toLocaleString("zh-CN")}</p><div className="mt-8"><Markdown>{document.content ?? ""}</Markdown></div></article></main>;
}
